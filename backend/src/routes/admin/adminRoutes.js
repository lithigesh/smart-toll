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
    // Provide more specific error messages for debugging
    const errorMessage = error.name === 'TokenExpiredError' 
      ? 'Token has expired. Please login again.'
      : error.name === 'JsonWebTokenError'
      ? 'Invalid token format. Please ensure you are using a valid JWT token from the /api/admin/login endpoint.'
      : 'Invalid token.';
    
    console.error('Token verification error:', {
      tokenPreview: token?.substring(0, 20) + '...',
      error: error.message
    });
    
    res.status(401).json({ 
      message: errorMessage,
      error: error.message 
    });
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

// Verify admin token (lightweight — used by frontend on session restore)
router.get('/verify', authenticateAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
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

    // Get recent transactions (last 5)
    const { data: recentTransactions, error: recentTransError } = await supabase
      .from('esp32_toll_transactions')
      .select(`
        *,
        vehicles (
          id,
          vehicle_number,
          vehicle_type,
          user_id,
          users (
            id,
            name,
            email
          )
        )
      `)
      .order('processed_at', { ascending: false })
      .limit(5);

    if (recentTransError) {
      console.error('Error fetching recent transactions:', recentTransError);
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

    // Map recent transactions to frontend format
    const formattedTransactions = (recentTransactions || []).map(t => ({
      id: t.id,
      amount: t.toll_amount,
      created_at: t.processed_at,
      toll_location: 'Toll Zone',
      device_id: t.device_id,
      status: 'completed',
      vehicle: t.vehicles ? {
        id: t.vehicles.id,
        vehicle_number: t.vehicles.vehicle_number,
        vehicle_type: t.vehicles.vehicle_type,
        user: t.vehicles.users ? {
          id: t.vehicles.users.id,
          name: t.vehicles.users.name,
          email: t.vehicles.users.email
        } : null
      } : null
    }));

    const response = {
      users: totalUsers || 0,
      vehicles: totalVehicles || 0,
      transactions: totalTransactions || 0,
      revenue: totalRevenue || 0,
      recentTransactions: formattedTransactions
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
    const { search = '', page = 1, limit = 10, user_id, vehicle_id } = req.query;
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

    // Filter by vehicle_id if provided (for viewing specific vehicle)
    if (vehicle_id) {
      query = query.eq('id', vehicle_id);
    }

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
    if (vehicle_id) {
      countQuery.eq('id', vehicle_id);
    }
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
      .from('vehicle_types')
      .select('id, type_name, rate_per_km, created_at')
      .order('type_name', { ascending: true });

    if (error) throw error;

    // Map the data to match frontend expectations
    const mappedRates = rates.map(rate => ({
      id: rate.id.toString(),
      vehicle_type: rate.type_name.toLowerCase(),
      rate: parseFloat(rate.rate_per_km),
      created_at: rate.created_at
    }));

    res.json({
      success: true,
      data: mappedRates || []
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
      .from('vehicle_types')
      .select('id, type_name, rate_per_km, created_at')
      .eq('id', id)
      .single();

    if (error || !rate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle rate not found' 
      });
    }

    // Map the data to match frontend expectations
    const mappedRate = {
      id: rate.id.toString(),
      vehicle_type: rate.type_name.toLowerCase(),
      rate: parseFloat(rate.rate_per_km),
      created_at: rate.created_at
    };

    res.json({
      success: true,
      data: mappedRate
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
    const { vehicle_type, rate } = req.body;

    // Validation
    if (!vehicle_type || !rate || rate <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle type and positive rate are required' 
      });
    }

    const { data: rateData, error } = await supabase
      .from('vehicle_types')
      .insert({
        type_name: vehicle_type,
        rate_per_km: parseFloat(rate)
      })
      .select('id, type_name as vehicle_type, rate_per_km as rate, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Vehicle rate created successfully',
      data: rateData
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
    const { rate } = req.body;

    // Validation
    if (rate === undefined || rate <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rate must be a positive number' 
      });
    }

    const { data: rateData, error } = await supabase
      .from('vehicle_types')
      .update({ rate_per_km: parseFloat(rate) })
      .eq('id', id)
      .select('id, type_name, rate_per_km, created_at')
      .single();

    if (error) throw error;

    if (!rateData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle rate not found' 
      });
    }

    // Map the data to match frontend expectations
    const mappedRate = {
      id: rateData.id.toString(),
      vehicle_type: rateData.type_name.toLowerCase(),
      rate: parseFloat(rateData.rate_per_km),
      created_at: rateData.created_at
    };

    res.json({
      success: true,
      message: 'Vehicle rate updated successfully',
      data: mappedRate
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
      .from('vehicle_types')
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

// Get all vehicle types with rates (alias for vehicle-rates)
router.get('/vehicle-types', authenticateAdmin, async (req, res) => {
  try {
    const { data: rates, error } = await supabase
      .from('vehicle_types')
      .select('id, type_name, rate_per_km, created_at')
      .order('type_name', { ascending: true });

    if (error) throw error;

    // Map the data to match frontend expectations
    const mappedRates = rates.map(rate => ({
      id: rate.id.toString(),
      vehicle_type: rate.type_name.toLowerCase(),
      rate: parseFloat(rate.rate_per_km),
      created_at: rate.created_at
    }));

    res.json({
      success: true,
      vehicleTypes: mappedRates || [],
      data: mappedRates || []
    });

  } catch (error) {
    console.error('Get vehicle types error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch vehicle types' 
    });
  }
});

// Update vehicle type rate
router.put('/vehicle-types/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rate } = req.body;

    if (!rate || rate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Rate must be a positive number'
      });
    }

    const { data: updatedRate, error } = await supabase
      .from('vehicle_types')
      .update({
        rate_per_km: Number(rate)
      })
      .eq('id', id)
      .select('id, type_name, rate_per_km, created_at')
      .single();

    if (error) {
      console.error('Update vehicle rate error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update vehicle rate',
        error: error.message
      });
    }

    if (!updatedRate) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle rate not found'
      });
    }

    // Map the data to match frontend expectations
    const mappedRate = {
      id: updatedRate.id.toString(),
      vehicle_type: updatedRate.type_name.toLowerCase(),
      rate: parseFloat(updatedRate.rate_per_km),
      created_at: updatedRate.created_at
    };

    res.json({
      success: true,
      message: 'Vehicle rate updated successfully',
      data: mappedRate
    });

  } catch (error) {
    console.error('Update vehicle rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle rate'
    });
  }
});

// Update user details
router.put('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, adminPassword } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Verify admin password for security
    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Admin password is required to update user details'
      });
    }

    const storedAdminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword !== storedAdminPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin password'
      });
    }

    // Update user in database
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        name,
        email,
        phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('User update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Update vehicle details
router.put('/search/vehicles/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_number, vehicle_type, device_id, adminPassword } = req.body;

    // Validate required fields
    if (!vehicle_number || !vehicle_type || !device_id) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle number, type, and device ID are required'
      });
    }

    // Verify admin password for security
    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Admin password is required to update vehicle details'
      });
    }

    const storedAdminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword !== storedAdminPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin password'
      });
    }

    // Update vehicle in database
    const { data: updatedVehicle, error } = await supabase
      .from('vehicles')
      .update({
        vehicle_number,
        vehicle_type,
        device_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Vehicle update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update vehicle',
        error: error.message
      });
    }

    if (!updatedVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle
    });

  } catch (error) {
    console.error('Vehicle update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle'
    });
  }
});

// Update vehicle status (activate/deactivate)
router.patch('/search/vehicles/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, adminPassword } = req.body;

    // Verify that is_active is a boolean
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be a boolean value'
      });
    }

    // Verify admin password for security
    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Admin password is required to change vehicle status'
      });
    }

    const storedAdminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword !== storedAdminPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin password'
      });
    }

    // Update vehicle status in database
    const { data: updatedVehicle, error } = await supabase
      .from('vehicles')
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Vehicle status update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update vehicle status',
        error: error.message
      });
    }

    if (!updatedVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      message: `Vehicle ${is_active ? 'activated' : 'deactivated'} successfully`,
      vehicle: updatedVehicle
    });

  } catch (error) {
    console.error('Vehicle status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle status'
    });
  }
});

module.exports = router;
