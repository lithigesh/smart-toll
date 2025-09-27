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

      console.log(`📍 Current zones found: ${currentZones?.length || 0}`);
      if (currentZone) {
        console.log(`📍 Vehicle is in zone: ${currentZone.name}`);
      }

      // For now, let's simplify and not use Journey model until it's fully working
      let activeJourney = null;
      try {
        activeJourney = await Journey.getActiveByVehicleId(vehicleId);
      } catch (journeyError) {
        console.log(`⚠️ Journey lookup failed (expected): ${journeyError.message}`);
        // Continue without journey - this is expected until Journey model is fully implemented
      }

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

        console.log(`✅ Vehicle ${vehicleId} entered zone: ${currentZone.name}`);

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
        if (currentZone.id === activeJourney.zone_id) {
          result.action = 'continuing_in_zone';
          console.log(`➡️ Vehicle ${vehicleId} continuing in zone: ${currentZone.name}`);
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

          console.log(`🔄 Vehicle ${vehicleId} changed zones: ${activeJourney.zone_name || 'Previous Zone'} → ${currentZone.name}`);
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

      // Extract toll_road_id from the related toll_roads array (use first one if multiple)
      const tollRoadId = zoneData.toll_roads && zoneData.toll_roads.length > 0 
        ? zoneData.toll_roads[0].id 
        : null;
      
      if (!tollRoadId) {
        console.error('No toll road ID found for zone:', zoneData);
        throw new Error('Invalid zone data: missing toll road information');
      }

      // Create journey entry
      const journey = await Journey.create({
        vehicle_id: vehicleId,
        toll_road_id: tollRoadId,
        zone_id: zoneData.id,
        entry_lat: latitude,
        entry_lon: longitude
      });

      // Create entry notification
      await Notifications.create({
        user_id: userId,
        type: 'entry',
        title: 'Toll Zone Entry',
        message: `Vehicle entered toll zone: ${zoneData.name}`,
        priority: 'medium',
        data: {
          journey_id: journey.id,
          zone_id: zoneData.id,
          zone_name: zoneData.name,
          road_name: zoneData.toll_roads[0]?.name || 'Unknown Road',
          entry_time: journey.entry_time,
          entry_coordinates: [longitude, latitude]
        }
      });

      return {
        journey_id: journey.id,
        zone_id: zoneData.id,
        zone_name: zoneData.name,
        road_name: zoneData.toll_roads[0]?.name || 'Unknown Road',
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

  /**
   * Get active journeys summary (for admin/monitoring)
   * @returns {Promise<Array>} - Active journeys
   */
  static async getActiveJourneys() {
    try {
      // This would need to be implemented in the Journey model
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting active journeys:', error);
      throw error;
    }
  }

  /**
   * Cancel active journey (for emergencies)
   * @param {string} journeyId - Journey ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} - Cancellation result
   */
  static async cancelJourney(journeyId, reason = 'Cancelled by system') {
    try {
      const cancelledJourney = await Journey.cancel(journeyId, reason);
      console.log(`❌ Journey ${journeyId} cancelled: ${reason}`);
      return cancelledJourney;
    } catch (error) {
      console.error('Error cancelling journey:', error);
      throw error;
    }
  }
}

module.exports = GeofencingService;