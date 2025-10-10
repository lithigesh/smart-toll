const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase } = require('../../config/supabase-db');

const router = express.Router();

// Admin login middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('Raw Authorization header:', authHeader);
  
  const token = authHeader?.replace('Bearer ', '');
  console.log('Extracted token:', token);
  console.log('Token type:', typeof token);
  console.log('Token length:', token?.length);
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    console.log('JWT verification failed:', error.message);
    console.log('Full error:', error);
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

    console.log('Generated admin token:', token);
    console.log('Token type:', typeof token);
    console.log('Token length:', token.length);

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
      transactions: totalTransactions || 0
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
          vehicleNumber,
          vehicleType,
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
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('vehicles')
      .select(`
        id,
        vehicle_number,
        vehicle_type,
        user_id,
        created_at,
        users (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply search filter if provided
    if (search) {
      query = query.or(`vehicle_number.ilike.%${search}%,vehicle_type.ilike.%${search}%,user_id.eq.${search}`);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    const { data: vehicles, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform data to match frontend expectations
    const transformedVehicles = vehicles?.map(vehicle => ({
      id: vehicle.id,
      license_plate: vehicle.vehicle_number,
      vehicle_type: vehicle.vehicle_type,
      user_id: vehicle.user_id,
      owner_name: vehicle.users?.name || 'Unknown',
      created_at: vehicle.created_at
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
    const { search = '', page = 1, limit = 10 } = req.query;
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
          name,
          email
        ),
        vehicles (
          vehicle_number,
          vehicle_type
        )
      `)
      .order('processed_at', { ascending: false });

    // Apply search filter if provided
    if (search) {
      query = query.or(`id.eq.${search},user_id.eq.${search},device_id.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('esp32_toll_transactions')
      .select('*', { count: 'exact', head: true });

    const { data: transactions, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform data to match frontend expectations
    const transformedTransactions = transactions?.map(transaction => ({
      id: transaction.id,
      user_id: transaction.user_id,
      user_name: transaction.users?.name || 'Unknown',
      vehicle_number: transaction.vehicles?.vehicle_number || 'Unknown',
      device_id: transaction.device_id,
      type: 'toll_payment',
      amount: transaction.toll_amount,
      distance_km: transaction.total_distance_km,
      status: transaction.status,
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

module.exports = router;