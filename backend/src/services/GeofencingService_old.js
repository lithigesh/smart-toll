const Journey = require('../models/Journey');
const TollRoadZone = require('../models/TollRoadZone');
const VehicleTypeRate = require('../models/VehicleTypeRate');
const Transaction = require('../models/Transaction');
const Notifications = require('../models/Notifications');
const GpsLog = require('../models/GpsLog');
const Vehicle = require('../models/Vehicle');
const Wallet = require('../models/Wallet');

class GeofencingService {
  /**
   * Process vehicle GPS position and handle zone entry/exit
   * @param {Object} params - GPS processing parameters
   * @param {string} params.vehicleId - Vehicle ID
   * @param {number} params.latitude - Current latitude
   * @param {number} params.longitude - Current longitude
   * @param {string} params.userId - User ID
   * @returns {Promise<Object>} - Processing result
   */
  static async processGpsPosition({ vehicleId, latitude, longitude, userId }) {
    try {
      console.log(`🛰️ Processing GPS position for vehicle ${vehicleId}: ${latitude}, ${longitude}`);

      const result = {
        action: 'none',
        journey_entry: null,
        journey_exit: null,
        toll_calculated: null,
        notifications: [],
        warnings: []
      };

      // Check if vehicle is currently in any toll zone
      const currentZones = await TollRoadZone.findZonesContainingPoint(latitude, longitude);
      const currentZone = currentZones && currentZones.length > 0 ? currentZones[0] : null;

      // Check if vehicle has an active journey
      const activeJourney = await Journey.getActiveByVehicleId(vehicleId);

      if (currentZone && !activeJourney) {
        // ENTRY: Vehicle entered a toll zone
        result.action = 'zone_entry';
        result.journey_entry = await this.handleZoneEntry({
          vehicleId,
          userId,
          zoneData: currentZone,
          latitude,
          longitude
        });

        console.log(`✅ Vehicle ${vehicleId} entered zone: ${currentZone.zone_name}`);

      } else if (!currentZone && activeJourney) {
        // EXIT: Vehicle exited toll zone
        result.action = 'zone_exit';
        result.journey_exit = await this.handleZoneExit({
          journey: activeJourney,
          vehicleId,
          userId,
          latitude,
          longitude
        });

        console.log(`🚪 Vehicle ${vehicleId} exited toll zone`);

      } else if (currentZone && activeJourney) {
        // CONTINUING: Vehicle is still in a toll zone
        if (currentZone.zone_id === activeJourney.zone_id) {
          result.action = 'continuing_in_zone';
          console.log(`➡️ Vehicle ${vehicleId} continuing in zone: ${currentZone.zone_name}`);
        } else {
          // ZONE CHANGE: Vehicle moved to a different toll zone
          result.action = 'zone_change';
          
          // Exit previous zone
          result.journey_exit = await this.handleZoneExit({
            journey: activeJourney,
            vehicleId,
            userId,
            latitude,
            longitude
          });

          // Enter new zone
          result.journey_entry = await this.handleZoneEntry({
            vehicleId,
            userId,
            zoneData: currentZone,
            latitude,
            longitude
          });

          console.log(`🔄 Vehicle ${vehicleId} changed zones: ${activeJourney.zone_name} → ${currentZone.zone_name}`);
        }
      } else {
        // NOT IN ZONE: Vehicle is outside all toll zones
        result.action = 'outside_zones';
        console.log(`🌍 Vehicle ${vehicleId} is outside all toll zones`);
      }

      return result;

    } catch (error) {
      console.error('Error processing GPS position:', error);
      throw error;
    }
  }

  /**
   * Handle vehicle entering a toll zone
   * @param {Object} params - Entry parameters
   * @param {string} params.vehicleId - Vehicle ID
   * @param {string} params.userId - User ID
   * @param {Object} params.zoneData - Zone data from detection
   * @param {number} params.latitude - Entry latitude
   * @param {number} params.longitude - Entry longitude
   * @returns {Promise<Object>} - Entry result
   */
  static async handleZoneEntry({ vehicleId, userId, zoneData, latitude, longitude }) {
    try {
      console.log(`🚀 Handling zone entry for vehicle ${vehicleId}`);

      // Create journey entry
      const journey = await Journey.create({
        vehicle_id: vehicleId,
        toll_road_id: zoneData.toll_road_id,
        zone_id: zoneData.zone_id,
        entry_lat: latitude,
        entry_lon: longitude
      });

      // Create entry notification
      await Notifications.create({
        user_id: userId,
        type: 'entry',
        title: 'Toll Zone Entry',
        message: `Vehicle entered toll zone: ${zoneData.zone_name}`,
        priority: 'medium',
        data: {
          journey_id: journey.id,
          zone_id: zoneData.zone_id,
          zone_name: zoneData.zone_name,
          road_name: zoneData.road_name,
          entry_time: journey.entry_time,
          entry_coordinates: [longitude, latitude]
        }
      });

      return {
        journey_id: journey.id,
        zone_id: zoneData.zone_id,
        zone_name: zoneData.zone_name,
        road_name: zoneData.road_name,
        entry_time: journey.entry_time,
        status: 'active'
      };

    } catch (error) {
      console.error('Error handling zone entry:', error);
      throw error;
    }
  }

  /**
   * Handle vehicle exiting a toll zone
   * @param {Object} params - Exit parameters  
   * @param {Object} params.journey - Active journey data
   * @param {string} params.vehicleId - Vehicle ID
   * @param {string} params.userId - User ID
   * @param {number} params.latitude - Exit latitude
   * @param {number} params.longitude - Exit longitude
   * @returns {Promise<Object>} - Exit result
   */
  static async handleZoneExit({ journey, vehicleId, userId, latitude, longitude }) {
    try {
      console.log(`🏁 Handling zone exit for journey ${journey.id}`);

      // Get vehicle information for rate calculation
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error(`Vehicle ${vehicleId} not found`);
      }

      // Complete journey and calculate toll
      const exitResult = await Journey.completeExit(journey.id, {
        exit_lat: latitude,
        exit_lon: longitude,
        use_path_distance: true // Use GPS path tracking for accuracy
      });

      console.log(`💰 Distance calculated: ${exitResult.distance_km} km, Fare: ₹${exitResult.fare_amount}`);

      // Create pending toll transaction (not deducted yet!)
      const pendingTransaction = await Transaction.createPendingToll({
        user_id: userId,
        vehicle_id: vehicleId,
        journey_id: journey.id,
        amount: exitResult.fare_amount,
        description: `Distance toll: ${exitResult.distance_km} km on ${journey.toll_roads?.name || 'toll road'}`,
        metadata: {
          distance_km: exitResult.distance_km,
          zone_name: journey.toll_roads?.toll_road_zones?.name,
          road_name: journey.toll_roads?.name,
          vehicle_type: vehicle.vehicle_type,
          exit_coordinates: [longitude, latitude]
        }
      });

      // Create exit notification with pending toll info
      await Notifications.create({
        user_id: userId,
        type: 'exit',
        title: 'Toll Zone Exit - Pending Payment',
        message: `Exited toll zone. Distance: ${exitResult.distance_km} km. Pending toll: ₹${exitResult.fare_amount}. Payment will be processed when you pass a toll gate.`,
        priority: 'medium',
        data: {
          journey_id: journey.id,
          transaction_id: pendingTransaction.id,
          distance_km: exitResult.distance_km,
          fare_amount: exitResult.fare_amount,
          exit_time: exitResult.exit_time,
          status: 'pending_payment'
        }
      });

      return {
        journey_id: journey.id,
        transaction_id: pendingTransaction.id,
        distance_km: exitResult.distance_km,
        fare_amount: exitResult.fare_amount,
        exit_time: exitResult.exit_time,
        status: 'pending_payment',
        payment_status: 'awaiting_toll_gate'
      };

    } catch (error) {
      console.error('Error handling zone exit:', error);
      
      // Handle insufficient balance or other errors
      if (error.message.includes('Insufficient wallet balance')) {
        await Notifications.create({
          user_id: userId,
          type: 'insufficient_balance',
          title: 'Toll Payment Failed',
          message: `Insufficient balance for toll payment. Please recharge your wallet. ${error.message}`,
          priority: 'high'
        });

        return {
          journey_id: journey.id,
          status: 'payment_failed',
          error: error.message,
          action_required: 'recharge_wallet'
        };
      }

      throw error;
    }
  }

  /**
   * Process pending toll payment when vehicle contacts toll gate
   * @param {Object} params - Payment processing parameters
   * @param {string} params.vehicleId - Vehicle ID
   * @param {string} params.tollGateId - Toll gate ID
   * @param {string} params.userId - User ID
   * @returns {Promise<Object>} - Payment result
   */
  static async processPendingTollAtGate({ vehicleId, tollGateId, userId }) {
    try {
      console.log(`🚧 Processing pending toll at gate ${tollGateId} for vehicle ${vehicleId}`);

      // Get all pending toll transactions for this user
      const pendingTolls = await Transaction.getPendingTolls(userId);

      if (!pendingTolls || pendingTolls.length === 0) {
        console.log('No pending tolls found');
        return {
          success: false,
          message: 'No pending tolls to process',
          processed_count: 0
        };
      }

      const results = [];
      let totalProcessed = 0;
      let totalAmount = 0;

      // Process each pending toll
      for (const pendingToll of pendingTolls) {
        try {
          // Check if user has sufficient wallet balance
          const wallet = await Wallet.findByUserId(userId);
          
          if (!wallet || wallet.balance < pendingToll.amount) {
            console.log(`Insufficient balance for transaction ${pendingToll.id}`);
            results.push({
              transaction_id: pendingToll.id,
              success: false,
              reason: 'insufficient_balance',
              amount: pendingToll.amount,
              required_balance: pendingToll.amount,
              current_balance: wallet ? wallet.balance : 0
            });
            continue;
          }

          // Process the payment atomically
          const processedTransaction = await this.processPaymentAtomically({
            pendingToll,
            tollGateId,
            userId,
            wallet
          });

          results.push({
            transaction_id: processedTransaction.id,
            success: true,
            amount: processedTransaction.amount,
            journey_id: processedTransaction.journey_id
          });

          totalProcessed++;
          totalAmount += processedTransaction.amount;

        } catch (error) {
          console.error(`Error processing pending toll ${pendingToll.id}:`, error);
          results.push({
            transaction_id: pendingToll.id,
            success: false,
            reason: 'processing_error',
            error: error.message
          });
        }
      }

      // Send summary notification
      if (totalProcessed > 0) {
        await Notifications.create({
          user_id: userId,
          type: 'toll_deducted',
          title: `Toll Payment Processed`,
          message: `${totalProcessed} pending toll(s) processed. Total: ₹${totalAmount}`,
          priority: 'medium',
          data: {
            processed_count: totalProcessed,
            total_amount: totalAmount,
            toll_gate_id: tollGateId,
            results
          }
        });
      }

      return {
        success: true,
        processed_count: totalProcessed,
        total_amount: totalAmount,
        results
      };

    } catch (error) {
      console.error('Error processing pending toll at gate:', error);
      throw error;
    }
  }

  /**
   * Process payment atomically (deduct wallet + update transaction)
   * @param {Object} params - Payment parameters
   * @returns {Promise<Object>} - Processing result
   */
  static async processPaymentAtomically({ pendingToll, tollGateId, userId, wallet }) {
    // This should be wrapped in a database transaction in production
    // For now, we'll do it sequentially and handle errors

    try {
      // 1. Deduct from wallet
      const updatedWallet = await Wallet.deduct(userId, pendingToll.amount);

      // 2. Update transaction status to completed
      const completedTransaction = await Transaction.processPendingToll(
        pendingToll.id, 
        tollGateId
      );

      // 3. Mark associated journey as settled
      if (pendingToll.journey_id) {
        await Journey.markAsSettled(pendingToll.journey_id, completedTransaction.id);
      }

      console.log(`✅ Payment processed: ₹${pendingToll.amount}, New balance: ₹${updatedWallet.balance}`);

      return completedTransaction;

    } catch (error) {
      console.error('Error in atomic payment processing:', error);
      throw error;
    }
  }
          latitude,
          longitude,
          userId,
          activeEntry
        });
        
      } else if (currentZone && activeEntry) {
        // Vehicle is continuing within a toll zone
        result.zoneAction = 'continuing';
        
        // Check if it's the same zone or a different one
        if (currentZone.id !== activeEntry.toll_road_zone_id) {
          // Vehicle moved to a different toll zone - exit previous, enter new
          result.tollExit = await this.handleZoneExit({
            vehicleId,
            latitude,
            longitude,
            userId,
            activeEntry
          });
          
          result.tollEntry = await this.handleZoneEntry({
            vehicleId,
            latitude,
            longitude,
            userId,
            zone: currentZone,
            vehicleInfo
          });
          
          result.zoneAction = 'zone_changed';
        }
        
      } else {
        // Vehicle is not in any toll zone
        result.zoneAction = 'none';
      }

      return result;

    } catch (error) {
      console.error('Error processing vehicle position:', error);
      throw error;
    }
  }

  /**
   * Handle vehicle entering a toll zone
   * @param {Object} params - Entry parameters
   * @returns {Promise<Object>} - Entry result
   */
  static async handleZoneEntry({ vehicleId, latitude, longitude, userId, zone, vehicleInfo }) {
    try {
      // Create toll history entry
      const tollEntry = await VehicleTollHistory.createEntry({
        vehicle_id: vehicleId,
        toll_road_zone_id: zone.id,
        entry_lat: latitude,
        entry_lon: longitude
      });

      // Send toll entry notification
      const notification = await Notifications.createTollEntryNotification(userId, {
        zoneId: zone.id,
        zoneName: zone.name,
        ratePerKm: zone.rate_per_km,
        entryTime: tollEntry.entry_time,
        vehicleId: vehicleId
      });

      console.log(`🚗 Vehicle ${vehicleId} entered toll zone: ${zone.name} at ${new Date().toISOString()}`);

      return {
        tollHistoryId: tollEntry.id,
        zone: zone,
        entryTime: tollEntry.entry_time,
        notification: notification
      };

    } catch (error) {
      console.error('Error handling zone entry:', error);
      throw error;
    }
  }

  /**
   * Handle vehicle exiting a toll zone
   * @param {Object} params - Exit parameters
   * @returns {Promise<Object>} - Exit result
   */
  static async handleZoneExit({ vehicleId, latitude, longitude, userId, activeEntry }) {
    try {
      // Calculate distance traveled within the toll zone
      const distance = await GpsLog.calculateDistanceTraveled(
        vehicleId, 
        activeEntry.entry_time, 
        new Date().toISOString()
      );

      // Calculate fare
      const ratePerKm = activeEntry.toll_road_zones?.rate_per_km || 10; // fallback rate
      const fareAmount = Math.max(distance * ratePerKm, 5); // Minimum fare of ₹5

      // Complete the toll entry
      const completedEntry = await VehicleTollHistory.completeExit(activeEntry.id, {
        exit_lat: latitude,
        exit_lon: longitude,
        distance_km: distance,
        fare_amount: fareAmount
      });

      // Process payment using TollProcessingService
      const paymentResult = await TollProcessingService.processTollCharge({
        tollHistoryId: completedEntry.id,
        userId,
        vehicleId,
        distanceKm: distance,
        ratePerKm,
        zoneInfo: {
          id: activeEntry.toll_road_zone_id,
          name: activeEntry.toll_road_zones?.name || 'Unknown Zone',
          minimum_fare: 5,
          tax_percentage: 0
        }
      });

      console.log(`🚗 Vehicle ${vehicleId} exited toll zone: ${activeEntry.toll_road_zones?.name}, Distance: ${distance}km, Fare: ₹${fareAmount}`);

      return {
        tollHistoryId: completedEntry.id,
        distance: distance,
        fareAmount: fareAmount,
        paymentResult: paymentResult,
        exitTime: completedEntry.exit_time
      };

    } catch (error) {
      console.error('Error handling zone exit:', error);
      throw error;
    }
  }

  /**
   * Get active toll zones near a location
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Promise<Array>} - Array of nearby toll zones
   */
  static async getNearbyTollZones(latitude, longitude, radiusKm = 5) {
    try {
      // Calculate bounding box for the search area
      const latDelta = radiusKm / 111; // Approximate degrees per km for latitude
      const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180)); // Adjust for longitude

      const bounds = {
        north: latitude + latDelta,
        south: latitude - latDelta,
        east: longitude + lonDelta,
        west: longitude - lonDelta
      };

      return await TollRoadZone.getZonesInBounds(bounds);

    } catch (error) {
      console.error('Error getting nearby toll zones:', error);
      throw error;
    }
  }

  /**
   * Check if a vehicle has been in a toll zone too long (for cleanup)
   * @param {string} vehicleId - Vehicle ID
   * @param {number} maxHours - Maximum hours to stay in a zone
   * @returns {Promise<Object|null>} - Stale entry if found
   */
  static async checkStaleEntry(vehicleId, maxHours = 24) {
    try {
      const activeEntry = await VehicleTollHistory.getActiveEntry(vehicleId);
      
      if (!activeEntry) {
        return null;
      }

      const entryTime = new Date(activeEntry.entry_time);
      const now = new Date();
      const hoursInZone = (now - entryTime) / (1000 * 60 * 60);

      if (hoursInZone > maxHours) {
        return {
          ...activeEntry,
          hoursInZone: Math.round(hoursInZone)
        };
      }

      return null;

    } catch (error) {
      console.error('Error checking stale entry:', error);
      throw error;
    }
  }

  /**
   * Force exit a vehicle from a toll zone (for cleanup/admin purposes)
   * @param {string} tollHistoryId - Toll history ID
   * @param {string} reason - Reason for forced exit
   * @returns {Promise<Object>} - Exit result
   */
  static async forceZoneExit(tollHistoryId, reason = 'System cleanup') {
    try {
      return await VehicleTollHistory.cancelEntry(tollHistoryId, reason);
    } catch (error) {
      console.error('Error forcing zone exit:', error);
      throw error;
    }
  }

  /**
   * Get geofencing statistics for monitoring
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} - Geofencing statistics
   */
  static async getGeofencingStats(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      // This would be implemented based on your specific analytics needs
      // For now, return basic structure
      return {
        totalEntries: 0,
        totalExits: 0,
        activeVehicles: 0,
        avgTimeInZone: 0,
        totalRevenue: 0
      };

    } catch (error) {
      console.error('Error getting geofencing stats:', error);
      throw error;
    }
  }
}

module.exports = GeofencingService;