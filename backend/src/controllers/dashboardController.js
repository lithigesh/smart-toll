const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Vehicle = require('../models/Vehicle');
const Transaction = require('../models/Transaction');
const TollGate = require('../models/TollGate');

const { asyncErrorHandler, NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');

/**
 * Get dashboard data for the authenticated user
 * GET /api/dashboard
 */
const getDashboard = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user profile
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Get wallet information
  const wallet = await Wallet.findByUserId(userId);
  const walletStats = await Wallet.getStats(userId);

  // Get user's vehicles
  const vehicles = await Vehicle.findByUserId(userId);

  // Get recent transactions (last 10)
  const recentTransactions = await Transaction.getUserTransactions(userId, { limit: 10 });

  // Get user statistics
  const userStats = await User.getStats(userId);

  // Get transaction statistics for current month
  const monthlyStats = await Transaction.getUserStats(userId, { period: 'month' });

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    },
    wallet: {
      balance: parseFloat(wallet?.balance || 0),
      balance_formatted: `₹${wallet?.balance || 0}`,
      last_updated: wallet?.updated_at,
      is_low_balance: wallet ? parseFloat(wallet.balance) < 100 : true
    },
    vehicles: vehicles.map(vehicle => ({
      id: vehicle.id,
      vehicle_no: vehicle.vehicle_no,
      vehicle_type: vehicle.vehicle_type,
      created_at: vehicle.created_at
    })),
    recent_transactions: recentTransactions.slice(0, 5).map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      amount_formatted: `₹${tx.amount}`,
      timestamp: tx.timestamp,
      details: tx.type === 'deduction' ? {
        vehicle_number: tx.vehicle_no,
        toll_gate_name: tx.toll_gate_name
      } : null
    })),
    stats: {
      all_time: {
        total_toll_crossings: parseInt(userStats.total_toll_crossings) || 0,
        total_recharges: parseInt(userStats.total_recharges) || 0,
        total_spent: parseFloat(userStats.total_spent) || 0,
        total_recharged: parseFloat(userStats.total_recharged) || 0,
        registered_vehicles: parseInt(userStats.registered_vehicles) || 0
      },
      monthly: {
        total_transactions: parseInt(monthlyStats.total_transactions) || 0,
        total_recharges: parseInt(monthlyStats.total_recharges) || 0,
        total_deductions: parseInt(monthlyStats.total_deductions) || 0,
        total_recharged: parseFloat(monthlyStats.total_recharged) || 0,
        total_spent: parseFloat(monthlyStats.total_spent) || 0,
        avg_toll_amount: parseFloat(monthlyStats.avg_toll_amount) || 0
      }
    },
    quick_actions: [
      {
        action: 'recharge',
        title: 'Recharge Wallet',
        description: 'Add money to your wallet',
        enabled: true
      },
      {
        action: 'add_vehicle',
        title: 'Add Vehicle',
        description: 'Register a new vehicle',
        enabled: true
      },
      {
        action: 'view_transactions',
        title: 'View History',
        description: 'See your transaction history',
        enabled: true
      }
    ],
    alerts: await generateUserAlerts(userId, wallet, vehicles)
  });
});

/**
 * Get user vehicles with their statistics
 * GET /api/dashboard/vehicles
 */
const getUserVehicles = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;

  const vehicles = await Vehicle.findByUserId(userId);
  
  // Get statistics for each vehicle
  const vehiclesWithStats = await Promise.all(
    vehicles.map(async (vehicle) => {
      const stats = await Vehicle.getStats(vehicle.id, userId);
      return {
        id: vehicle.id,
        vehicle_no: vehicle.vehicle_no,
        vehicle_type: vehicle.vehicle_type,
        created_at: vehicle.created_at,
        stats: {
          total_crossings: parseInt(stats.total_toll_crossings) || 0,
          total_spent: parseFloat(stats.total_toll_paid) || 0,
          avg_toll_amount: parseFloat(stats.avg_toll_amount) || 0,
          last_crossing: stats.last_toll_crossing,
          unique_toll_gates: parseInt(stats.unique_toll_gates) || 0
        }
      };
    })
  );

  res.json({
    vehicles: vehiclesWithStats,
    total_vehicles: vehicles.length
  });
});

/**
 * Add a new vehicle
 * POST /api/dashboard/vehicles
 */
const addVehicle = asyncErrorHandler(async (req, res) => {
  const { vehicle_no, vehicle_type = 'car' } = req.body;
  const userId = req.user.id;

  // Validate vehicle number format
  const validation = Vehicle.validateVehicleNo(vehicle_no);
  if (!validation.valid) {
    throw new ValidationError(validation.message);
  }

  // Check if vehicle already exists
  const existingVehicle = await Vehicle.findByVehicleNo(validation.cleaned);
  if (existingVehicle) {
    throw new ConflictError('Vehicle number is already registered');
  }

  // Create new vehicle
  const vehicle = await Vehicle.create({
    user_id: userId,
    vehicle_no: validation.cleaned,
    vehicle_type
  });

  res.status(201).json({
    message: 'Vehicle added successfully',
    vehicle: {
      id: vehicle.id,
      vehicle_no: vehicle.vehicle_no,
      vehicle_type: vehicle.vehicle_type,
      created_at: vehicle.created_at
    }
  });
});

/**
 * Update vehicle information
 * PUT /api/dashboard/vehicles/:vehicleId
 */
const updateVehicle = asyncErrorHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { vehicle_no, vehicle_type } = req.body;
  const userId = req.user.id;

  // Validate vehicle number if provided
  if (vehicle_no) {
    const validation = Vehicle.validateVehicleNo(vehicle_no);
    if (!validation.valid) {
      throw new ValidationError(validation.message);
    }

    // Check if new vehicle number is already taken
    const existing = await Vehicle.vehicleNoExists(validation.cleaned, userId);
    if (existing) {
      throw new ConflictError('Vehicle number is already registered');
    }
  }

  // Update vehicle
  const updates = {};
  if (vehicle_no) updates.vehicle_no = vehicle_no;
  if (vehicle_type) updates.vehicle_type = vehicle_type;

  const updatedVehicle = await Vehicle.update(vehicleId, userId, updates);
  
  if (!updatedVehicle) {
    throw new NotFoundError('Vehicle not found or access denied');
  }

  res.json({
    message: 'Vehicle updated successfully',
    vehicle: {
      id: updatedVehicle.id,
      vehicle_no: updatedVehicle.vehicle_no,
      vehicle_type: updatedVehicle.vehicle_type,
      created_at: updatedVehicle.created_at
    }
  });
});

/**
 * Delete a vehicle
 * DELETE /api/dashboard/vehicles/:vehicleId
 */
const deleteVehicle = asyncErrorHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const userId = req.user.id;

  const success = await Vehicle.delete(vehicleId, userId);
  
  if (!success) {
    throw new NotFoundError('Vehicle not found or access denied');
  }

  res.json({
    message: 'Vehicle deleted successfully'
  });
});

/**
 * Get toll gates information
 * GET /api/dashboard/toll-gates
 */
const getTollGates = asyncErrorHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  const tollGates = await TollGate.getAll({
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    toll_gates: tollGates.map(gate => ({
      id: gate.id,
      name: gate.name,
      location: {
        lat: parseFloat(gate.gps_lat),
        long: parseFloat(gate.gps_long)
      },
      charge: parseFloat(gate.charge),
      charge_formatted: `₹${gate.charge}`,
      created_at: gate.created_at
    })),
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      has_more: tollGates.length === parseInt(limit)
    }
  });
});

/**
 * Generate user-specific alerts
 */
async function generateUserAlerts(userId, wallet, vehicles) {
  const alerts = [];

  // Low balance alert
  if (wallet && parseFloat(wallet.balance) < 100) {
    alerts.push({
      type: 'low_balance',
      severity: 'warning',
      title: 'Low Wallet Balance',
      message: `Your wallet balance is ₹${wallet.balance}. Please recharge to continue using toll services.`,
      action: 'recharge'
    });
  }

  // No vehicles registered alert
  if (vehicles.length === 0) {
    alerts.push({
      type: 'no_vehicles',
      severity: 'info',
      title: 'No Vehicles Registered',
      message: 'Add your vehicles to start using the smart toll system.',
      action: 'add_vehicle'
    });
  }

  // Very low balance alert (critical)
  if (wallet && parseFloat(wallet.balance) < 50) {
    alerts.push({
      type: 'critical_balance',
      severity: 'error',
      title: 'Critical Balance',
      message: `Your wallet balance is critically low (₹${wallet.balance}). Immediate recharge required.`,
      action: 'recharge_urgent'
    });
  }

  return alerts;
}

module.exports = {
  getDashboard,
  getUserVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getTollGates
};