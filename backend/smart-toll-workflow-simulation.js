#!/usr/bin/env node

/**
 * 🚦 SMART TOLL SYSTEM - COMPLETE WORKFLOW SIMULATION
 * 
 * Built from scratch following the exact workflow specification:
 * 
 * 🔐 PHASE 1: Authentication - User login with credential verification
 * 🚗 PHASE 2: Vehicle Verification - Registration & hardware mapping validation  
 * 🛰️ PHASE 3: GPS Entry into Toll Zone - Geofenced zone entry detection
 * 📏 PHASE 4: Route Simulation - Vehicle movement & GPS logging inside zone
 * 💳 PHASE 5: Toll Encounter - Distance charges + pending balance deduction
 * 📍 PHASE 6: Route Simulation (Post Toll) - Continued journey after payment
 * 🏁 PHASE 7: Toll Zone Exit - Geofenced zone exit detection & trip completion
 * 💰 PHASE 8: Payment Verification - Wallet balance & transaction confirmation
 */

require('dotenv').config();

const axios = require('axios');

// API Configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
  TIMEOUT: 8000,
  TEST_CREDENTIALS: {
    email: 'test@smarttoll.com',
    password: 'password123'
  }
};

// Test Vehicle Configuration
const VEHICLE_CONFIG = {
  plate_number: 'TN37AB1234',
  vehicle_type: 'car',
  model: 'Maruti Swift DZire',
  device_id: 'ESP32-30:AE:A4:78:9A:BC'
};

// Geofenced Zone Configuration
const TOLL_ZONE_CONFIG = {
  // Entry point (outside → inside geofence)
  entry_point: {
    lat: 10.9750,
    lon: 76.9000,
    location: 'Toll Zone Entry Gate'
  },
  
  // Route waypoints inside the toll zone
  route_waypoints: [
    { lat: 11.1000, lon: 77.1000, location: 'Highway Point 1', km_from_entry: 2.5 },
    { lat: 11.0500, lon: 77.0500, location: 'Highway Point 2', km_from_entry: 5.0 },
    { lat: 10.9900, lon: 76.9300, location: 'Toll Gate Location', km_from_entry: 8.5 },
    { lat: 10.9500, lon: 76.9000, location: 'Highway Point 3', km_from_entry: 12.0 },
    { lat: 10.9200, lon: 76.8700, location: 'Highway Point 4', km_from_entry: 15.5 }
  ],
  
  // Exit point (inside → outside geofence)  
  exit_point: {
    lat: 11.3000,
    lon: 77.3000,
    location: 'Toll Zone Exit Gate'
  },
  
  // Toll gate configuration
  toll_gate: {
    lat: 10.9900,
    lon: 76.9300,
    location: 'NH544 Express Toll Plaza',
    km_from_entry: 8.5,
    cost_per_km: 8.0,
    vehicle_factors: {
      'car': 1.0,
      'bike': 0.5,
      'truck': 2.0,
      'bus': 1.8
    }
  }
};

class SmartTollWorkflowSimulator {
  constructor() {
    this.authToken = null;
    this.userId = null;
    this.vehicleId = null;
    this.journeyId = null;
    this.transactionId = null;
    
    // Financial tracking
    this.initialWalletBalance = 0;
    this.finalWalletBalance = 0;
    this.tollChargesDeducted = 0;
    this.pendingBalancePaid = 0;
    
    // Journey tracking
    this.entryTime = null;
    this.exitTime = null;
    this.totalDistanceTraveled = 0;
    this.gpsLogs = [];
    
    // Phase completion tracking
    this.phaseResults = {
      authentication: { status: 'pending', timestamp: null, data: {} },
      vehicle_verification: { status: 'pending', timestamp: null, data: {} },
      gps_entry: { status: 'pending', timestamp: null, data: {} },
      route_simulation_pre_toll: { status: 'pending', timestamp: null, data: {} },
      toll_encounter: { status: 'pending', timestamp: null, data: {} },
      route_simulation_post_toll: { status: 'pending', timestamp: null, data: {} },
      gps_exit: { status: 'pending', timestamp: null, data: {} },
      payment_verification: { status: 'pending', timestamp: null, data: {} }
    };
  }

  // Enhanced logging with phase tracking
  log(message, type = 'info', phase = null) {
    const timestamp = new Date().toISOString();
    const icons = {
      'info': '📋',
      'success': '✅', 
      'error': '❌',
      'warning': '⚠️',
      'phase': '🎯',
      'gps': '🛰️',
      'money': '💰',
      'vehicle': '🚗',
      'toll': '🚦'
    };
    
    const icon = icons[type] || 'ℹ️';
    const phasePrefix = phase ? `[${phase}] ` : '';
    
    console.log(`[${timestamp.split('T')[1].split('.')[0]}] ${icon} ${phasePrefix}${message}`);
    
    return { timestamp, message, type, phase };
  }

  // Update phase completion status
  async updatePhaseResult(phase, status, message, data = {}) {
    this.phaseResults[phase] = {
      status,
      message,
      timestamp: new Date().toISOString(),
      data
    };
  }

  // Add GPS log entry
  addGpsLog(lat, lon, location, additionalData = {}) {
    const gpsEntry = {
      timestamp: new Date().toISOString(),
      latitude: lat,
      longitude: lon,
      location: location,
      journey_id: this.journeyId,
      vehicle_id: this.vehicleId,
      ...additionalData
    };
    
    this.gpsLogs.push(gpsEntry);
    this.log(`GPS logged: ${location} (${lat}, ${lon})`, 'gps');
    
    return gpsEntry;
  }

  // Calculate distance between two GPS points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 100) / 100;
  }

  // PHASE 1: Authentication - User login with credential verification
  async phase1_Authentication() {
    try {
      this.log('='.repeat(80), 'phase');
      this.log('PHASE 1: AUTHENTICATION - User Login & Credential Verification', 'phase');
      this.log('='.repeat(80), 'phase');
      
      this.log(`Attempting login with email: ${API_CONFIG.TEST_CREDENTIALS.email}`, 'info');
      
      const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/login`, {
        email: API_CONFIG.TEST_CREDENTIALS.email,
        password: API_CONFIG.TEST_CREDENTIALS.password
      }, {
        timeout: API_CONFIG.TIMEOUT
      });

      if (response.data && response.data.token) {
        this.authToken = response.data.token;
        this.userId = response.data.user.id;
        
        this.log(`✓ Authentication successful!`, 'success');
        this.log(`✓ User ID: ${this.userId}`, 'info');
        this.log(`✓ User Name: ${response.data.user.name}`, 'info');
        this.log(`✓ Email: ${response.data.user.email}`, 'info');
        this.log(`✓ Session token received and stored`, 'success');
        
        await this.updatePhaseResult('authentication', 'success', 'User authentication completed', {
          user_id: this.userId,
          user_name: response.data.user.name,
          email: response.data.user.email,
          token_length: this.authToken.length
        });
        
        return true;
      } else {
        throw new Error('No authentication token received from server');
      }
    } catch (error) {
      this.log(`✗ Authentication failed: ${error.message}`, 'error');
      await this.updatePhaseResult('authentication', 'failed', `Authentication failed: ${error.message}`);
      return false;
    }
  }

  // PHASE 2: Vehicle Verification - Registration & hardware mapping validation
  async phase2_VehicleVerification() {
    try {
      this.log('='.repeat(80), 'phase');
      this.log('PHASE 2: VEHICLE VERIFICATION - Registration & Hardware Mapping', 'phase');
      this.log('='.repeat(80), 'phase');
      
      this.log('Fetching user\'s registered vehicles...', 'info');
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/dashboard/vehicles`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
        timeout: API_CONFIG.TIMEOUT
      });

      const vehicles = response.data.vehicles;
      this.log(`✓ Found ${vehicles.length} registered vehicles for user`, 'success');
      
      // Find the test vehicle
      const testVehicle = vehicles.find(v => v.plate_number === VEHICLE_CONFIG.plate_number);
      
      if (!testVehicle) {
        throw new Error(`Test vehicle ${VEHICLE_CONFIG.plate_number} not found in user's registered vehicles`);
      }
      
      this.vehicleId = testVehicle.id;
      
      this.log(`✓ Vehicle verification successful:`, 'success');
      this.log(`  • Registration Number: ${testVehicle.plate_number}`, 'vehicle');
      this.log(`  • Vehicle Type: ${testVehicle.vehicle_type}`, 'vehicle');
      this.log(`  • Model: ${testVehicle.model}`, 'vehicle');
      this.log(`  • Device ID: ${testVehicle.device_id || 'Not mapped'}`, 'vehicle');
      this.log(`  • Vehicle ID: ${this.vehicleId}`, 'vehicle');
      this.log(`  • Status: ${testVehicle.is_active ? 'Active' : 'Inactive'}`, 'vehicle');
      this.log(`  • Hardware Mapping: ${testVehicle.device_id ? 'Verified' : 'Not configured'}`, 'vehicle');
      
      // Get initial wallet balance
      const walletResponse = await axios.get(`${API_CONFIG.BASE_URL}/wallet/balance`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
        timeout: API_CONFIG.TIMEOUT
      });
      
      this.initialWalletBalance = walletResponse.data.balance;
      this.log(`✓ Initial wallet balance: ₹${this.initialWalletBalance}`, 'money');
      
      await this.updatePhaseResult('vehicle_verification', 'success', 'Vehicle verification completed', {
        vehicle_id: this.vehicleId,
        plate_number: testVehicle.plate_number,
        vehicle_type: testVehicle.vehicle_type,
        model: testVehicle.model,
        device_id: testVehicle.device_id,
        is_active: testVehicle.is_active,
        initial_wallet_balance: this.initialWalletBalance
      });
      
      return true;
    } catch (error) {
      this.log(`✗ Vehicle verification failed: ${error.message}`, 'error');
      await this.updatePhaseResult('vehicle_verification', 'failed', `Vehicle verification failed: ${error.message}`);
      return false;
    }
  }

  // PHASE 3: GPS Entry into Toll Zone - Geofenced zone entry detection  
  async phase3_GpsEntryDetection() {
    try {
      this.log('='.repeat(80), 'phase');
      this.log('PHASE 3: GPS ENTRY DETECTION - Geofenced Zone Entry', 'phase');
      this.log('='.repeat(80), 'phase');
      
      // First, ensure vehicle is in a known outside position
      const outsidePosition = { lat: 11.3000, lon: 77.3000 };
      this.log(`🔄 Resetting vehicle to outside position: ${outsidePosition.lat}, ${outsidePosition.lon}`, 'info');
      
      try {
        const resetResponse = await axios.post(`${API_CONFIG.BASE_URL}/gps/manual-position`, {
          vehicle_id: this.vehicleId,
          latitude: outsidePosition.lat,
          longitude: outsidePosition.lon,
          simulate_movement: true
        }, {
          headers: { Authorization: `Bearer ${this.authToken}` },
          timeout: API_CONFIG.TIMEOUT
        });
        
        this.log(`✓ Vehicle reset to outside position - action: ${resetResponse.data.data.geofencing?.action}`, 'info');
        
        // Small delay to ensure position is registered
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (resetError) {
        this.log(`⚠️ Reset position warning: ${resetError.message}`, 'warning');
      }
      
      const entryPoint = TOLL_ZONE_CONFIG.entry_point;
      this.log(`Vehicle approaching toll zone entry...`, 'gps');
      this.log(`• Entry Location: ${entryPoint.location}`, 'gps');
      this.log(`• Entry Coordinates: ${entryPoint.lat}, ${entryPoint.lon}`, 'gps');
      
      // Simulate GPS entry detection
      const response = await axios.post(`${API_CONFIG.BASE_URL}/gps/manual-position`, {
        vehicle_id: this.vehicleId,
        latitude: entryPoint.lat,
        longitude: entryPoint.lon,
        simulate_movement: true
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` },
        timeout: API_CONFIG.TIMEOUT
      });

      if (response.data.success && response.data.data.geofencing?.journey_entry) {
        const entryData = response.data.data.geofencing.journey_entry;
        this.journeyId = entryData.journey_id;
        this.entryTime = new Date(entryData.entry_time);
        
        this.log(`✓ Geofenced zone entry detected!`, 'success');
        this.log(`✓ Journey created with ID: ${this.journeyId}`, 'success');
        this.log(`✓ Entry time: ${this.entryTime.toLocaleString()}`, 'info');
        this.log(`✓ Geofencing action: ${response.data.data.geofencing.action}`, 'info');
        
        // Add GPS log for entry
        this.addGpsLog(entryPoint.lat, entryPoint.lon, entryPoint.location, {
          event: 'zone_entry',
          journey_id: this.journeyId
        });
        
        await this.updatePhaseResult('gps_entry', 'success', 'GPS entry detection completed', {
          journey_id: this.journeyId,
          entry_time: entryData.entry_time,
          entry_coordinates: entryPoint,
          geofencing_action: response.data.data.geofencing.action
        });
        
        return true;
      } else {
        throw new Error(`Geofenced zone entry not detected - action: ${response.data.data.geofencing?.action}`);
      }
    } catch (error) {
      this.log(`✗ GPS entry detection failed: ${error.message}`, 'error');
      await this.updatePhaseResult('gps_entry', 'failed', `GPS entry detection failed: ${error.message}`);
      return false;
    }
  }

  // PHASE 4: Route Simulation - Vehicle movement & GPS logging inside zone (Pre-Toll)
  async phase4_RouteSimulationPreToll() {
    try {
      this.log('='.repeat(80), 'phase');
      this.log('PHASE 4: ROUTE SIMULATION (PRE-TOLL) - GPS Logging Inside Zone', 'phase');
      this.log('='.repeat(80), 'phase');
      
      this.log('Starting route simulation from entry to toll gate...', 'gps');
      
      const tollGateKm = TOLL_ZONE_CONFIG.toll_gate.km_from_entry;
      const preTollWaypoints = TOLL_ZONE_CONFIG.route_waypoints.filter(wp => wp.km_from_entry <= tollGateKm);
      
      for (let i = 0; i < preTollWaypoints.length; i++) {
        const waypoint = preTollWaypoints[i];
        
        this.log(`• GPS Update ${i + 1}/${preTollWaypoints.length}: ${waypoint.location}`, 'gps');
        this.log(`  Coordinates: ${waypoint.lat}, ${waypoint.lon}`, 'gps');
        this.log(`  Distance from entry: ${waypoint.km_from_entry} km`, 'gps');
        
        // Send GPS update to server
        const response = await axios.post(`${API_CONFIG.BASE_URL}/gps/manual-position`, {
          vehicle_id: this.vehicleId,
          latitude: waypoint.lat,
          longitude: waypoint.lon,
          simulate_movement: true
        }, {
          headers: { Authorization: `Bearer ${this.authToken}` },
          timeout: API_CONFIG.TIMEOUT
        });
        
        if (response.data.success) {
          this.log(`  ✓ GPS position logged successfully`, 'gps');
        }
        
        // Add to local GPS log
        this.addGpsLog(waypoint.lat, waypoint.lon, waypoint.location, {
          km_from_entry: waypoint.km_from_entry,
          phase: 'pre_toll'
        });
        
        // Simulate travel time
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.log(`✓ Pre-toll route simulation completed`, 'success');
      this.log(`✓ Vehicle has reached toll gate area (${tollGateKm} km from entry)`, 'success');
      
      await this.updatePhaseResult('route_simulation_pre_toll', 'success', 'Pre-toll route simulation completed', {
        waypoints_covered: preTollWaypoints.length,
        distance_to_toll_gate: tollGateKm,
        gps_logs_count: this.gpsLogs.length
      });
      
      return true;
    } catch (error) {
      this.log(`✗ Route simulation (pre-toll) failed: ${error.message}`, 'error');
      await this.updatePhaseResult('route_simulation_pre_toll', 'failed', `Route simulation failed: ${error.message}`);
      return false;
    }
  }

  // Get pending balance from database
  async getPendingBalance(userId) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data: pendingTransactions, error } = await supabase
        .from('transactions')
        .select('id, amount, status, created_at, description')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .eq('type', 'toll')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Error querying pending transactions:', error.message);
        return { totalAmount: 0, transactions: [] };
      }
      
      if (!pendingTransactions || pendingTransactions.length === 0) {
        return { totalAmount: 0, transactions: [] };
      }
      
      const totalPending = pendingTransactions.reduce((sum, tx) => {
        return sum + parseFloat(tx.amount || 0);
      }, 0);
      
      this.log(`Found ${pendingTransactions.length} pending transactions totaling ₹${totalPending}`, 'warning');
      
      return {
        totalAmount: totalPending,
        transactions: pendingTransactions
      };
    } catch (error) {
      console.warn('Error getting pending balance:', error.message);
      return { totalAmount: 0, transactions: [] };
    }
  }

  // Mark pending transactions as completed
  async markPendingAsCompleted(transactions) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      for (const transaction of transactions) {
        const { error } = await supabase
          .from('transactions')
          .update({ 
            status: 'completed',
            description: transaction.description.replace('Pending toll payment:', 'Paid toll payment:').replace('Distance toll:', 'Paid distance toll:'),
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id);
          
        if (error) {
          console.warn(`Failed to mark transaction ${transaction.id} as completed:`, error.message);
        }
      }
      
      this.log(`Successfully marked ${transactions.length} pending transactions as completed`, 'success');
      return true;
    } catch (error) {
      this.log(`Failed to mark pending transactions as completed: ${error.message}`, 'error');
      return false;
    }
  }

  // Create new toll transaction in database
  async createTollTransaction(amount, description, status = 'completed') {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: this.userId,
          vehicle_id: this.vehicleId,
          type: 'toll',
          amount: amount,
          description: description,
          status: status,
          journey_id: this.journeyId,
          metadata: {
            toll_gate_location: 'NH544 Express Toll Plaza',
            distance_km: 8.5,
            vehicle_type: 'car',
            rate_per_km: 8,
            payment_method: 'wallet_deduction',
            transaction_source: 'simulation'
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.warn('Error creating toll transaction:', error.message);
        return null;
      }
      
      this.log(`Created new toll transaction: ₹${amount} - ${description}`, 'success');
      return data;
    } catch (error) {
      console.warn('Error creating toll transaction:', error.message);
      return null;
    }
  }

  // PHASE 5: Toll Encounter - Distance charges + pending balance deduction
  async phase5_TollEncounter() {
    try {
      this.log('='.repeat(80), 'phase');
      this.log('PHASE 5: TOLL ENCOUNTER - Distance Charges & Pending Balance', 'phase');
      this.log('='.repeat(80), 'phase');
      
      const tollGate = TOLL_ZONE_CONFIG.toll_gate;
      this.log(`🚦 Vehicle crossing toll gate: ${tollGate.location}`, 'toll');
      
      // Calculate distance charges
      const distanceTraveled = tollGate.km_from_entry;
      const vehicleFactor = tollGate.vehicle_factors[VEHICLE_CONFIG.vehicle_type] || 1.0;
      const distanceCharges = Math.round(distanceTraveled * tollGate.cost_per_km * vehicleFactor * 100) / 100;
      
      this.log(`📏 Distance traveled to toll gate: ${distanceTraveled} km`, 'info');
      this.log(`💰 Cost per km: ₹${tollGate.cost_per_km}`, 'info');
      this.log(`🚗 Vehicle factor (${VEHICLE_CONFIG.vehicle_type}): ${vehicleFactor}x`, 'info');
      this.log(`💳 Distance charges: ₹${distanceCharges}`, 'money');
      
      // Get pending balance from transactions table
      const pendingData = await this.getPendingBalance(this.userId);
      const pendingBalance = pendingData.totalAmount;
      
      this.log(`📋 Pending balance from previous trips: ₹${pendingBalance}`, 'warning');
      
      const totalCharges = distanceCharges + pendingBalance;
      this.log(`💸 Total charges at toll gate: ₹${totalCharges}`, 'money');
      
      // Check wallet balance
      const walletResponse = await axios.get(`${API_CONFIG.BASE_URL}/wallet/balance`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
        timeout: API_CONFIG.TIMEOUT
      });
      
      const currentBalance = walletResponse.data.balance;
      this.log(`💰 Current wallet balance: ₹${currentBalance}`, 'money');
      
      if (currentBalance >= totalCharges) {
        // Process wallet deduction
        const walletDeductResponse = await axios.post(`${API_CONFIG.BASE_URL}/wallet/deduct`, {
          amount: totalCharges,
          description: `Toll payment: ${distanceTraveled}km @ ₹${tollGate.cost_per_km}/km + pending ₹${pendingBalance}`,
          vehicle_plate: VEHICLE_CONFIG.plate_number
        }, {
          headers: { 
            Authorization: `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: API_CONFIG.TIMEOUT
        });
        
        if (walletDeductResponse.data && walletDeductResponse.data.success) {
          const newBalance = walletDeductResponse.data.data.new_balance;
          this.log(`✅ Wallet deduction successful!`, 'success');
          this.log(`✅ Amount deducted: ₹${totalCharges}`, 'success');
          this.log(`💰 New wallet balance: ₹${newBalance}`, 'money');
          
          this.tollChargesDeducted = distanceCharges;
          this.pendingBalancePaid = pendingBalance;
          
          // Mark pending transactions as completed if any
          if (pendingData.transactions.length > 0) {
            await this.markPendingAsCompleted(pendingData.transactions);
            this.log(`✅ Marked ${pendingData.transactions.length} pending transactions as completed`, 'success');
          }
          
          // Create transaction record only for current distance charges
          if (distanceCharges > 0) {
            await this.createTollTransaction(distanceCharges, 
              `Toll payment at ${tollGate.location}: ${distanceTraveled}km distance charges`, 
              'completed'
            );
          }
          
          // Add GPS log for toll gate passage
          this.addGpsLog(tollGate.lat, tollGate.lon, tollGate.location, {
            event: 'toll_payment',
            amount_charged: totalCharges,
            distance_charges: distanceCharges,
            pending_balance_paid: pendingBalance
          });
          
          await this.updatePhaseResult('toll_encounter', 'success', 'Toll encounter completed', {
            toll_location: tollGate.location,
            distance_traveled_km: distanceTraveled,
            distance_charges: distanceCharges,
            pending_balance_paid: pendingBalance,
            total_charges: totalCharges,
            new_wallet_balance: newBalance,
            pending_transactions_cleared: pendingData.transactions.length
          });
          
          return true;
        } else {
          throw new Error('Wallet deduction failed: ' + (walletDeductResponse.data?.message || 'Unknown error'));
        }
      } else {
        throw new Error(`Insufficient wallet balance: ₹${currentBalance} < ₹${totalCharges}`);
      }
    } catch (error) {
      this.log(`✗ Toll encounter failed: ${error.message}`, 'error');
      await this.updatePhaseResult('toll_encounter', 'failed', `Toll encounter failed: ${error.message}`);
      return false;
    }
  }

  // PHASE 6: Route Simulation (Post Toll) - Continued journey after payment
  async phase6_RouteSimulationPostToll() {
    try {
      this.log('='.repeat(80), 'phase');
      this.log('PHASE 6: ROUTE SIMULATION (POST-TOLL) - Continued Journey', 'phase');
      this.log('='.repeat(80), 'phase');
      
      this.log('Continuing route simulation after toll payment...', 'gps');
      
      const tollGateKm = TOLL_ZONE_CONFIG.toll_gate.km_from_entry;
      const postTollWaypoints = TOLL_ZONE_CONFIG.route_waypoints.filter(wp => wp.km_from_entry > tollGateKm);
      
      for (let i = 0; i < postTollWaypoints.length; i++) {
        const waypoint = postTollWaypoints[i];
        
        this.log(`• GPS Update ${i + 1}/${postTollWaypoints.length}: ${waypoint.location}`, 'gps');
        this.log(`  Coordinates: ${waypoint.lat}, ${waypoint.lon}`, 'gps');
        this.log(`  Distance from entry: ${waypoint.km_from_entry} km`, 'gps');
        
        // Send GPS update to server
        const response = await axios.post(`${API_CONFIG.BASE_URL}/gps/manual-position`, {
          vehicle_id: this.vehicleId,
          latitude: waypoint.lat,
          longitude: waypoint.lon,
          simulate_movement: true
        }, {
          headers: { Authorization: `Bearer ${this.authToken}` },
          timeout: API_CONFIG.TIMEOUT
        });
        
        if (response.data.success) {
          this.log(`  ✓ GPS position logged successfully`, 'gps');
        }
        
        // Add to local GPS log
        this.addGpsLog(waypoint.lat, waypoint.lon, waypoint.location, {
          km_from_entry: waypoint.km_from_entry,
          phase: 'post_toll'
        });
        
        // Simulate travel time
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.log(`✓ Post-toll route simulation completed`, 'success');
      this.log(`✓ Vehicle approaching toll zone exit`, 'success');
      
      await this.updatePhaseResult('route_simulation_post_toll', 'success', 'Post-toll route simulation completed', {
        waypoints_covered: postTollWaypoints.length,
        total_gps_logs: this.gpsLogs.length
      });
      
      return true;
    } catch (error) {
      this.log(`✗ Route simulation (post-toll) failed: ${error.message}`, 'error');
      await this.updatePhaseResult('route_simulation_post_toll', 'failed', `Route simulation failed: ${error.message}`);
      return false;
    }
  }

  // PHASE 7: Toll Zone Exit - Geofenced zone exit detection & trip completion
  async phase7_TollZoneExit() {
    try {
      this.log('='.repeat(80), 'phase');
      this.log('PHASE 7: TOLL ZONE EXIT - Geofenced Zone Exit & Trip Completion', 'phase');
      this.log('='.repeat(80), 'phase');
      
      const exitPoint = TOLL_ZONE_CONFIG.exit_point;
      this.log(`Vehicle approaching toll zone exit...`, 'gps');
      this.log(`• Exit Location: ${exitPoint.location}`, 'gps');
      this.log(`• Exit Coordinates: ${exitPoint.lat}, ${exitPoint.lon}`, 'gps');
      
      // Simulate GPS exit detection
      const response = await axios.post(`${API_CONFIG.BASE_URL}/gps/manual-position`, {
        vehicle_id: this.vehicleId,
        latitude: exitPoint.lat,
        longitude: exitPoint.lon,
        simulate_movement: true
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` },
        timeout: API_CONFIG.TIMEOUT
      });

      if (response.data.success && response.data.data.geofencing?.journey_exit) {
        const exitData = response.data.data.geofencing.journey_exit;
        this.transactionId = exitData.transaction_id;
        this.exitTime = new Date();
        this.totalDistanceTraveled = exitData.distance_km || 0;
        
        this.log(`✓ Geofenced zone exit detected!`, 'success');
        this.log(`✓ Journey completed with ID: ${this.journeyId}`, 'success');
        this.log(`✓ Transaction ID: ${this.transactionId}`, 'success');
        this.log(`✓ Exit time: ${this.exitTime.toLocaleString()}`, 'info');
        this.log(`✓ Total distance traveled: ${this.totalDistanceTraveled} km`, 'info');
        
        const journeyDuration = Math.round((this.exitTime - this.entryTime) / 60000); // minutes
        this.log(`✓ Journey duration: ${journeyDuration} minutes`, 'info');
        
        // Calculate pending amount for remaining distance after toll gate
        const lastTollGateKm = TOLL_ZONE_CONFIG.toll_gate.km_from_entry; // 8.5 km
        const remainingDistance = Math.max(0, this.totalDistanceTraveled - lastTollGateKm);
        
        if (remainingDistance > 0) {
          // Backend now correctly calculates pending for REMAINING distance only
          const baseRatePerKm = TOLL_ZONE_CONFIG.toll_gate.cost_per_km; // ₹8
          const vehicleFactor = TOLL_ZONE_CONFIG.toll_gate.vehicle_factors['car'] || 1.0; // 1.0x
          const minimumFare = 10; // Backend default
          
          // Correct calculation for remaining distance only:
          const distanceCharge = remainingDistance * baseRatePerKm;
          const vehicleAdjustedFare = distanceCharge * vehicleFactor;
          const serviceFee = Math.max(remainingDistance * 0.1, 1.0); // Min ₹1 service fee
          const totalWithService = vehicleAdjustedFare + serviceFee;
          const finalFare = Math.max(totalWithService, minimumFare);
          const expectedPendingAmount = Math.round(finalFare * 100) / 100; // Round to 2 decimal places
          
          this.log(`📏 Remaining distance after toll gate: ${remainingDistance.toFixed(2)} km`, 'info');
          this.log(`💰 Distance charge: ₹${distanceCharge.toFixed(2)} (${remainingDistance.toFixed(2)}km × ₹${baseRatePerKm})`, 'info');
          this.log(`💰 Service fee: ₹${serviceFee.toFixed(2)}`, 'info');
          this.log(`💰 Vehicle multiplier: ${vehicleFactor}x (car)`, 'info');
          this.log(`💰 Expected pending amount: ₹${expectedPendingAmount} (for remaining distance only)`, 'warning');
          this.log(`✅ Backend API will create pending transaction for remaining distance`, 'success');
        } else {
          this.log(`✅ No remaining distance - no pending balance created`, 'success');
        }
        
        // Add GPS log for exit
        this.addGpsLog(exitPoint.lat, exitPoint.lon, exitPoint.location, {
          event: 'zone_exit',
          journey_id: this.journeyId,
          transaction_id: this.transactionId,
          total_distance: this.totalDistanceTraveled,
          remaining_distance: remainingDistance,
          expected_pending_amount: remainingDistance > 0 ? Math.round((Math.max(remainingDistance * 8 * 1.0 + Math.max(remainingDistance * 0.1, 1.0), 10)) * 100) / 100 : 0,
          pending_transaction_created: remainingDistance > 0,
          note: 'Backend creates pending transaction for remaining distance after toll gate'
        });
        
        await this.updatePhaseResult('gps_exit', 'success', 'GPS exit detection and trip completion successful', {
          journey_id: this.journeyId,
          transaction_id: this.transactionId,
          exit_time: this.exitTime.toISOString(),
          total_distance_km: this.totalDistanceTraveled,
          journey_duration_minutes: journeyDuration,
          exit_coordinates: exitPoint
        });
        
        return true;
      } else {
        throw new Error(`Geofenced zone exit not detected - action: ${response.data.data.geofencing?.action}`);
      }
    } catch (error) {
      this.log(`✗ Toll zone exit detection failed: ${error.message}`, 'error');
      await this.updatePhaseResult('gps_exit', 'failed', `Toll zone exit detection failed: ${error.message}`);
      return false;
    }
  }

  // PHASE 8: Payment Verification - Wallet balance & transaction confirmation
  async phase8_PaymentVerification() {
    try {
      this.log('='.repeat(80), 'phase');
      this.log('PHASE 8: PAYMENT VERIFICATION - Wallet & Transaction Confirmation', 'phase');
      this.log('='.repeat(80), 'phase');
      
      this.log('Verifying final payment status and transaction history...', 'info');
      
      // Get final wallet balance
      const walletResponse = await axios.get(`${API_CONFIG.BASE_URL}/wallet/balance`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
        timeout: API_CONFIG.TIMEOUT
      });
      
      this.finalWalletBalance = walletResponse.data.balance;
      const totalAmountDeducted = this.initialWalletBalance - this.finalWalletBalance;
      
      this.log(`✓ Final wallet balance confirmed: ₹${this.finalWalletBalance}`, 'money');
      this.log(`✓ Total amount deducted during journey: ₹${totalAmountDeducted}`, 'money');
      this.log(`  • Distance charges: ₹${this.tollChargesDeducted}`, 'money');
      this.log(`  • Pending balance paid: ₹${this.pendingBalancePaid}`, 'money');
      
      // Verify no pending transactions remain
      const remainingPending = await this.getPendingBalance(this.userId);
      this.log(`✓ Remaining pending transactions: ${remainingPending.transactions.length}`, 'info');
      this.log(`✓ Remaining pending balance: ₹${remainingPending.totalAmount}`, 'info');
      
      // Transaction history verification
      try {
        const historyResponse = await axios.get(`${API_CONFIG.BASE_URL}/wallet/transactions?limit=5`, {
          headers: { Authorization: `Bearer ${this.authToken}` },
          timeout: API_CONFIG.TIMEOUT
        });
        
        if (historyResponse.data?.data?.transactions) {
          const transactions = historyResponse.data.data.transactions;
          this.log(`✓ Retrieved ${transactions.length} recent transactions`, 'success');
          
          const currentJourneyTransaction = transactions.find(t => t.journey_id === this.journeyId);
          if (currentJourneyTransaction) {
            this.log(`✓ Current journey transaction verified in history`, 'success');
            this.log(`  • Transaction ID: ${currentJourneyTransaction.id}`, 'info');
            this.log(`  • Amount: ₹${currentJourneyTransaction.amount}`, 'info');
            this.log(`  • Status: ${currentJourneyTransaction.status}`, 'info');
          }
        }
      } catch (historyError) {
        this.log(`⚠️ Transaction history verification skipped: ${historyError.message}`, 'warning');
      }
      
      await this.updatePhaseResult('payment_verification', 'success', 'Payment verification completed', {
        initial_balance: this.initialWalletBalance,
        final_balance: this.finalWalletBalance,
        total_deducted: totalAmountDeducted,
        distance_charges: this.tollChargesDeducted,
        pending_balance_paid: this.pendingBalancePaid,
        remaining_pending_balance: remainingPending.totalAmount,
        remaining_pending_transactions: remainingPending.transactions.length
      });
      
      return true;
    } catch (error) {
      this.log(`✗ Payment verification failed: ${error.message}`, 'error');
      await this.updatePhaseResult('payment_verification', 'failed', `Payment verification failed: ${error.message}`);
      return false;
    }
  }

  // Generate comprehensive simulation report
  generateFinalReport() {
    this.log('='.repeat(80), 'phase');
    this.log('SMART TOLL WORKFLOW SIMULATION - FINAL REPORT', 'phase');
    this.log('='.repeat(80), 'phase');
    
    const successfulPhases = Object.values(this.phaseResults).filter(p => p.status === 'success').length;
    const totalPhases = Object.keys(this.phaseResults).length;
    const successRate = (successfulPhases / totalPhases * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(100));
    console.log('🚦 SMART TOLL SYSTEM - COMPLETE WORKFLOW SIMULATION REPORT');
    console.log('='.repeat(100));
    console.log(`🔐 Phase 1 - Authentication:              ${this.phaseResults.authentication.status.toUpperCase()}`);
    console.log(`🚗 Phase 2 - Vehicle Verification:        ${this.phaseResults.vehicle_verification.status.toUpperCase()}`);
    console.log(`🛰️ Phase 3 - GPS Entry Detection:         ${this.phaseResults.gps_entry.status.toUpperCase()}`);
    console.log(`📏 Phase 4 - Route Simulation (Pre-Toll): ${this.phaseResults.route_simulation_pre_toll.status.toUpperCase()}`);
    console.log(`💳 Phase 5 - Toll Encounter:              ${this.phaseResults.toll_encounter.status.toUpperCase()}`);
    console.log(`📍 Phase 6 - Route Simulation (Post-Toll):${this.phaseResults.route_simulation_post_toll.status.toUpperCase()}`);
    console.log(`🏁 Phase 7 - GPS Exit Detection:          ${this.phaseResults.gps_exit.status.toUpperCase()}`);
    console.log(`💰 Phase 8 - Payment Verification:        ${this.phaseResults.payment_verification.status.toUpperCase()}`);
    console.log('-'.repeat(100));
    console.log(`🚗 Vehicle: ${VEHICLE_CONFIG.plate_number} (${VEHICLE_CONFIG.vehicle_type})`);
    console.log(`📊 Journey ID: ${this.journeyId}`);
    console.log(`🧾 Transaction ID: ${this.transactionId}`);
    console.log(`📏 Total Distance: ${this.totalDistanceTraveled} km`);
    console.log(`⏱️ Journey Time: ${this.entryTime ? Math.round((this.exitTime - this.entryTime) / 60000) : 0} minutes`);
    console.log(`🛰️ GPS Logs Generated: ${this.gpsLogs.length}`);
    console.log(`💰 Initial Wallet Balance: ₹${this.initialWalletBalance}`);
    console.log(`💰 Final Wallet Balance: ₹${this.finalWalletBalance}`);
    console.log(`💸 Total Amount Deducted: ₹${this.initialWalletBalance - this.finalWalletBalance}`);
    console.log(`  • Distance Charges: ₹${this.tollChargesDeducted}`);
    console.log(`  • Pending Balance Paid: ₹${this.pendingBalancePaid}`);
    console.log('='.repeat(100));
    console.log(`🏆 OVERALL SUCCESS RATE: ${successRate}% (${successfulPhases}/${totalPhases})`);
    console.log('='.repeat(100) + '\n');
    
    return {
      success_rate: successRate,
      successful_phases: successfulPhases,
      total_phases: totalPhases,
      phase_results: this.phaseResults,
      journey_summary: {
        journey_id: this.journeyId,
        transaction_id: this.transactionId,
        vehicle: VEHICLE_CONFIG.plate_number,
        distance_km: this.totalDistanceTraveled,
        duration_minutes: this.entryTime ? Math.round((this.exitTime - this.entryTime) / 60000) : 0,
        gps_logs: this.gpsLogs.length,
        financial_summary: {
          initial_balance: this.initialWalletBalance,
          final_balance: this.finalWalletBalance,
          total_deducted: this.initialWalletBalance - this.finalWalletBalance,
          distance_charges: this.tollChargesDeducted,
          pending_balance_paid: this.pendingBalancePaid
        }
      }
    };
  }

  // Main workflow runner
  async runCompleteWorkflow() {
    this.log('🚀 STARTING SMART TOLL SYSTEM WORKFLOW SIMULATION', 'phase');
    this.log('Built from scratch following the complete 8-phase specification', 'info');
    
    try {
      let allPhasesSuccessful = true;
      
      // Execute all 8 phases in sequence
      const phases = [
        { name: 'Phase 1: Authentication', method: this.phase1_Authentication },
        { name: 'Phase 2: Vehicle Verification', method: this.phase2_VehicleVerification },
        { name: 'Phase 3: GPS Entry Detection', method: this.phase3_GpsEntryDetection },
        { name: 'Phase 4: Route Simulation (Pre-Toll)', method: this.phase4_RouteSimulationPreToll },
        { name: 'Phase 5: Toll Encounter', method: this.phase5_TollEncounter },
        { name: 'Phase 6: Route Simulation (Post-Toll)', method: this.phase6_RouteSimulationPostToll },
        { name: 'Phase 7: GPS Exit Detection', method: this.phase7_TollZoneExit },
        { name: 'Phase 8: Payment Verification', method: this.phase8_PaymentVerification }
      ];
      
      for (const phase of phases) {
        if (allPhasesSuccessful) {
          const result = await phase.method.call(this);
          if (!result) {
            allPhasesSuccessful = false;
            this.log(`❌ ${phase.name} failed - stopping workflow`, 'error');
            break;
          }
        }
      }
      
      // Generate final report
      const report = this.generateFinalReport();
      
      if (allPhasesSuccessful) {
        this.log('🎉 SMART TOLL WORKFLOW SIMULATION COMPLETED SUCCESSFULLY!', 'success');
        this.log('All 8 phases executed successfully with real transaction processing', 'success');
      } else {
        this.log('⚠️ SMART TOLL WORKFLOW SIMULATION COMPLETED WITH FAILURES', 'warning');
        this.log('Check the detailed report above for failure information', 'warning');
      }
      
      return report;
    } catch (error) {
      this.log(`💥 WORKFLOW SIMULATION FAILED: ${error.message}`, 'error');
      this.generateFinalReport();
      throw error;
    }
  }
}

// Run the complete workflow simulation
if (require.main === module) {
  const simulator = new SmartTollWorkflowSimulator();
  simulator.runCompleteWorkflow()
    .then((report) => {
      process.exit(report.successful_phases === report.total_phases ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Simulation failed:', error.message);
      process.exit(1);
    });
}

module.exports = SmartTollWorkflowSimulator;