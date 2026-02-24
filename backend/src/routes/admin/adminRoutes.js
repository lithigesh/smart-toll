const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase } = require('../../config/supabase-db');

const router = express.Router();

// Admin login middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.', error: error.message });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check credentials against environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return res.status(500).json({ 
        success: false, 
        message: 'Admin credentials not configured' 
      });
    }

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        username: adminUsername,
        role: 'admin' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        username: adminUsername,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get dashboard analytics
router.get('/analytics', authenticateAdmin, async (req, res) => {
  try {
    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total vehicles count
    const { count: totalVehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    // Get total transactions count (from esp32_toll_transactions - actual toll transactions)
    const { count: totalTransactions, error: transactionsError } = await supabase
      .from('esp32_toll_transactions')
      .select('*', { count: 'exact', head: true });

    // Get total revenue (sum of all toll_amounts)
    const { data: revenueData, error: revenueError } = await supabase
      .from('esp32_toll_transactions')
      .select('toll_amount');

    let totalRevenue = 0;
    if (!revenueError && revenueData) {
      totalRevenue = revenueData.reduce((sum, transaction) => sum + (transaction.toll_amount || 0), 0);
    }

    // Check for any database errors
    if (usersError || vehiclesError || transactionsError) {
      console.error('Database errors:', { usersError, vehiclesError, transactionsError });
      return res.status(500).json({
        success: false,
        message: 'Database query failed',
        errors: { usersError, vehiclesError, transactionsError }
      });
    }

    const response = {
      users: totalUsers || 0,
      vehicles: totalVehicles || 0,
      transactions: totalTransactions || 0,
      revenue: totalRevenue || 0
    };
    
    res.json(response);

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch analytics' 
    });
  }
});

// Search users by ID or filter
router.get('/search/users', authenticateAdmin, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        created_at
      `)
      .order('created_at', { ascending: false });

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,id.eq.${search}`);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { data: users, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      data: users || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Users search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch users' 
    });
  }
});

// Get user details by ID
router.get('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user details with wallet and vehicles
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        wallets (
          balance,
          created_at
        ),
        vehicles (
          id,
          vehicle_number,
          vehicle_type,
          model,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get user's recent transactions
    const { data: transactions } = await supabase
      .from('recharges')
      .select('*')
      .eq('userId', id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      user: {
        ...user,
        recentTransactions: transactions || []
      }
    });

  } catch (error) {
    console.error('User details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user details' 
    });
  }
});

// Search vehicles
router.get('/search/vehicles', authenticateAdmin, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('vehicles')
      .select(`
        id,
        vehicle_number,
        vehicle_type,
        device_id,
        is_active,
        user_id,
        created_at,
        users (
          id,
          name,
          email,
          phone,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by user_id if provided
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`vehicle_number.ilike.%${search}%,vehicle_type.ilike.%${search}%,user_id.eq.${search}`);
    }

    // Get total count for pagination
    const countQuery = supabase.from('vehicles').select('*', { count: 'exact', head: true });
    if (user_id) {
      countQuery.eq('user_id', user_id);
    }
    const { count } = await countQuery;

    const { data: vehicles, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform data to match frontend expectations
    const transformedVehicles = vehicles?.map(vehicle => ({
      id: vehicle.id,
      vehicle_number: vehicle.vehicle_number,
      vehicle_type: vehicle.vehicle_type,
      device_id: vehicle.device_id,
      is_active: vehicle.is_active,
      user_id: vehicle.user_id,
      created_at: vehicle.created_at,
      user: vehicle.users ? {
        id: vehicle.users.id,
        name: vehicle.users.name,
        email: vehicle.users.email,
        phone: vehicle.users.phone,
        created_at: vehicle.users.created_at,
        updated_at: vehicle.users.updated_at
      } : null
    })) || [];

    res.json({
      data: transformedVehicles,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Vehicles search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search vehicles' 
    });
  }
});

// Search transactions
router.get('/search/transactions', authenticateAdmin, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('esp32_toll_transactions')
      .select(`
        id,
        user_id,
        device_id,
        toll_amount,
        total_distance_km,
        status,
        processed_at,
        users (
          id,
          name,
          email,
          phone,
          created_at,
          updated_at
        ),
        vehicles (
          id,
          vehicle_number,
          vehicle_type,
          device_id
        )
      `)
      .order('processed_at', { ascending: false });

    // Filter by user_id if provided
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`id.eq.${search},user_id.eq.${search},device_id.ilike.%${search}%`);
    }

    // Get total count for pagination
    let countQuery = supabase.from('esp32_toll_transactions').select('*', { count: 'exact', head: true });
    if (user_id) {
      countQuery = countQuery.eq('user_id', user_id);
    }
    const { count } = await countQuery;

    const { data: transactions, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform data to match frontend expectations
    const transformedTransactions = transactions?.map(transaction => ({
      id: transaction.id,
      user_id: transaction.user_id,
      vehicle_id: transaction.vehicles?.id,
      user_name: transaction.users?.name || 'Unknown',
      user: transaction.users ? {
        id: transaction.users.id,
        name: transaction.users.name,
        email: transaction.users.email,
        phone: transaction.users.phone,
        created_at: transaction.users.created_at,
        updated_at: transaction.users.updated_at
      } : null,
      vehicle: {
        vehicle_number: transaction.vehicles?.vehicle_number || 'Unknown',
        vehicle_type: transaction.vehicles?.vehicle_type || 'Unknown'
      },
      device_id: transaction.device_id,
      type: 'toll_payment',
      amount: transaction.toll_amount,
      distance_km: transaction.total_distance_km,
      toll_location: null,
      // Map database status to frontend status
      status: transaction.status === 'success' ? 'completed' : 
              transaction.status === 'insufficient_balance' ? 'failed' : 
              transaction.status,
      payment_method: 'Wallet',
      created_at: transaction.processed_at
    })) || [];

    res.json({
      data: transformedTransactions,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Transactions search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search transactions' 
    });
  }
});

// ========== VEHICLE RATES MANAGEMENT ==========

// Get all vehicle rates
router.get('/vehicle-rates', authenticateAdmin, async (req, res) => {
  try {
    const { data: rates, error } = await supabase
      .from('vehicle_type_rates')
      .select('*')
      .order('vehicle_type', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: rates || []
    });

  } catch (error) {
    console.error('Get vehicle rates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch vehicle rates' 
    });
  }
});

// Get single vehicle rate by ID
router.get('/vehicle-rates/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: rate, error } = await supabase
      .from('vehicle_type_rates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !rate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle rate not found' 
      });
    }

    res.json({
      success: true,
      data: rate
    });

  } catch (error) {
    console.error('Get vehicle rate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch vehicle rate' 
    });
  }
});

// Create new vehicle rate
router.post('/vehicle-rates', authenticateAdmin, async (req, res) => {
  try {
    const { vehicle_type, base_rate, per_km_rate, description } = req.body;

    // Validation
    if (!vehicle_type || base_rate === undefined || per_km_rate === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle type, base rate, and per km rate are required' 
      });
    }

    const { data: rate, error } = await supabase
      .from('vehicle_type_rates')
      .insert({
        vehicle_type,
        base_rate: parseFloat(base_rate),
        per_km_rate: parseFloat(per_km_rate),
        description: description || null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Vehicle rate created successfully',
      data: rate
    });

  } catch (error) {
    console.error('Create vehicle rate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create vehicle rate' 
    });
  }
});

// Update vehicle rate
router.put('/vehicle-rates/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_type, base_rate, per_km_rate, description } = req.body;

    // Validation
    if (!vehicle_type && base_rate === undefined && per_km_rate === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one field is required to update' 
      });
    }

    const updateData = {};
    if (vehicle_type) updateData.vehicle_type = vehicle_type;
    if (base_rate !== undefined) updateData.base_rate = parseFloat(base_rate);
    if (per_km_rate !== undefined) updateData.per_km_rate = parseFloat(per_km_rate);
    if (description !== undefined) updateData.description = description;

    const { data: rate, error } = await supabase
      .from('vehicle_type_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!rate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle rate not found' 
      });
    }

    res.json({
      success: true,
      message: 'Vehicle rate updated successfully',
      data: rate
    });

  } catch (error) {
    console.error('Update vehicle rate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update vehicle rate' 
    });
  }
});

// Delete vehicle rate
router.delete('/vehicle-rates/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('vehicle_type_rates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Vehicle rate deleted successfully'
    });

  } catch (error) {
    console.error('Delete vehicle rate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete vehicle rate' 
    });
  }
});

module.exports = router;
