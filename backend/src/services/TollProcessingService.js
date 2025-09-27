const Journey = require('../models/Journey');
const VehicleTypeRate = require('../models/VehicleTypeRate');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Notifications = require('../models/Notifications');
const Vehicle = require('../models/Vehicle');
const TollGate = require('../models/TollGate');

class TollProcessingService {
  /**
   * Process pending tolls when vehicle reaches a toll gate
   * @param {Object} params - Processing parameters
   * @param {string} params.userId - User ID
   * @param {string} params.vehicleId - Vehicle ID  
   * @param {string} params.tollGateId - Toll gate ID
   * @param {string} params.gateType - Gate type (entry/exit/payment)
   * @returns {Promise<Object>} - Processing result
   */
  static async processAtTollGate(params) {
    const { userId, vehicleId, tollGateId, gateType = 'payment' } = params;

    try {
      console.log(`🚧 Processing toll at gate ${tollGateId} for vehicle ${vehicleId}`);

      // Get pending toll transactions for this user
      const pendingTolls = await Transaction.getPendingTolls(userId);

      if (!pendingTolls || pendingTolls.length === 0) {
        return {
          success: true,
          message: 'No pending tolls to process',
          processed_count: 0,
          total_amount: 0
        };
      }

      const results = [];
      let totalProcessed = 0;
      let totalAmount = 0;
      let insufficientBalance = false;

      // Get user wallet balance
      const wallet = await Wallet.findByUserId(userId);
      if (!wallet) {
        throw new Error('User wallet not found');
      }

      // Calculate total pending amount
      const totalPendingAmount = pendingTolls.reduce((sum, toll) => sum + toll.amount, 0);

      // Check if user has sufficient balance for all pending tolls
      if (wallet.balance < totalPendingAmount) {
        insufficientBalance = true;

        // Create notification for insufficient balance
        await Notifications.create({
          user_id: userId,
          type: 'insufficient_balance',
          title: 'Insufficient Balance for Toll Payment',
          message: `Cannot process ${pendingTolls.length} pending toll(s) worth ₹${totalPendingAmount}. Current balance: ₹${wallet.balance}. Please recharge your wallet.`,
          priority: 'high',
          data: {
            required_amount: totalPendingAmount,
            current_balance: wallet.balance,
            pending_tolls_count: pendingTolls.length,
            toll_gate_id: tollGateId
          }
        });

        return {
          success: false,
          message: 'Insufficient wallet balance',
          required_amount: totalPendingAmount,
          current_balance: wallet.balance,
          processed_count: 0,
          total_amount: 0,
          action_required: 'recharge_wallet'
        };
      }

      // Process each pending toll
      for (const pendingToll of pendingTolls) {
        try {
          // Process the payment atomically
          const processedTransaction = await this.processPaymentAtomically({
            pendingToll,
            tollGateId,
            userId,
            gateType
          });

          results.push({
            transaction_id: processedTransaction.id,
            journey_id: processedTransaction.journey_id,
            success: true,
            amount: processedTransaction.amount,
            distance_km: processedTransaction.metadata?.distance_km
          });

          totalProcessed++;
          totalAmount += processedTransaction.amount;

          console.log(`✅ Processed toll: ₹${processedTransaction.amount} for journey ${processedTransaction.journey_id}`);

        } catch (error) {
          console.error(`Error processing pending toll ${pendingToll.id}:`, error);
          results.push({
            transaction_id: pendingToll.id,
            journey_id: pendingToll.journey_id,
            success: false,
            reason: 'processing_error',
            error: error.message,
            amount: pendingToll.amount
          });
        }
      }

      // Send summary notification
      if (totalProcessed > 0) {
        await Notifications.create({
          user_id: userId,
          type: 'toll_payment_processed',
          title: `Toll Payment Complete - ₹${totalAmount}`,
          message: `${totalProcessed} pending toll payment(s) processed successfully at toll gate.`,
          priority: 'medium',
          data: {
            processed_count: totalProcessed,
            total_amount: totalAmount,
            toll_gate_id: tollGateId,
            new_wallet_balance: wallet.balance - totalAmount,
            processing_results: results
          }
        });
      }

      console.log(`🎯 Toll processing complete: ${totalProcessed} payments, ₹${totalAmount} total`);

      return {
        success: true,
        processed_count: totalProcessed,
        total_amount: totalAmount,
        new_wallet_balance: wallet.balance - totalAmount,
        results
      };

    } catch (error) {
      console.error('Error processing toll at gate:', error);
      throw error;
    }
  }

  /**
   * Process payment atomically (deduct wallet + update transaction)
   * @param {Object} params - Payment parameters
   * @returns {Promise<Object>} - Processing result
   */
  static async processPaymentAtomically({ pendingToll, tollGateId, userId, gateType }) {
    try {
      // 1. Deduct from wallet
      const updatedWallet = await Wallet.deduct(userId, pendingToll.amount, {
        description: `Toll payment: ${pendingToll.description}`,
        reference: tollGateId
      });

      // 2. Update transaction status to completed
      const completedTransaction = await Transaction.processPendingToll(
        pendingToll.id, 
        tollGateId
      );

      // 3. Mark associated journey as settled
      if (pendingToll.journey_id) {
        await Journey.markAsSettled(pendingToll.journey_id, completedTransaction.id);
      }

      console.log(`💳 Payment processed: ₹${pendingToll.amount}, New balance: ₹${updatedWallet.balance}`);

      return completedTransaction;

    } catch (error) {
      console.error('Error in atomic payment processing:', error);
      
      // If wallet deduction fails, don't update transaction
      if (error.message.includes('Insufficient')) {
        throw new Error(`Insufficient wallet balance: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Calculate toll fare based on distance and vehicle type
   * @param {Object} params - Calculation parameters
   * @param {number} params.distanceKm - Distance in kilometers
   * @param {string} params.vehicleType - Vehicle type (car, truck, bus, bike)
   * @param {string} params.tollRoadId - Toll road ID
   * @param {Object} params.options - Additional calculation options
   * @returns {Promise<Object>} - Fare calculation result
   */
  static async calculateDistanceFare(params) {
    const { distanceKm, vehicleType, tollRoadId, options = {} } = params;

    try {
      // Get rate for vehicle type on this toll road
      const rate = await VehicleTypeRate.getRate(vehicleType, tollRoadId);
      
      if (!rate) {
        throw new Error(`No rate found for vehicle type ${vehicleType} on toll road ${tollRoadId}`);
      }

      // Calculate base fare
      let baseFare = distanceKm * rate.rate_per_km;
      
      // Apply minimum fare
      baseFare = Math.max(baseFare, rate.minimum_fare || 5);

      // Apply distance-based discounts
      let discountMultiplier = 1;
      if (distanceKm > 100) {
        discountMultiplier = 0.9; // 10% discount for long distances
      } else if (distanceKm > 50) {
        discountMultiplier = 0.95; // 5% discount for medium distances
      }

      let finalFare = baseFare * discountMultiplier;

      // Apply rounding
      const roundingFactor = options.roundingFactor || 0.5;
      finalFare = Math.ceil(finalFare / roundingFactor) * roundingFactor;

      return {
        distance_km: distanceKm,
        vehicle_type: vehicleType,
        base_rate_per_km: rate.rate_per_km,
        minimum_fare: rate.minimum_fare,
        base_fare: baseFare,
        discount_applied: (1 - discountMultiplier) * 100, // percentage
        final_fare: finalFare,
        calculation_breakdown: {
          distance_km: distanceKm,
          rate_per_km: rate.rate_per_km,
          base_amount: distanceKm * rate.rate_per_km,
          minimum_applied: baseFare > (distanceKm * rate.rate_per_km),
          discount_percentage: (1 - discountMultiplier) * 100,
          final_amount: finalFare
        }
      };

    } catch (error) {
      console.error('Error calculating distance fare:', error);
      throw error;
    }
  }

  /**
   * Get pending toll summary for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Pending toll summary
   */
  static async getPendingTollSummary(userId) {
    try {
      const pendingTolls = await Transaction.getPendingTolls(userId);
      const wallet = await Wallet.findByUserId(userId);

      const summary = {
        pending_count: pendingTolls.length,
        total_pending_amount: pendingTolls.reduce((sum, toll) => sum + toll.amount, 0),
        current_wallet_balance: wallet ? wallet.balance : 0,
        can_process_all: false,
        pending_journeys: []
      };

      summary.can_process_all = summary.current_wallet_balance >= summary.total_pending_amount;

      // Group by journey
      summary.pending_journeys = pendingTolls.map(toll => ({
        transaction_id: toll.id,
        journey_id: toll.journey_id,
        amount: toll.amount,
        distance_km: toll.metadata?.distance_km || 0,
        vehicle_plate: toll.vehicles?.plate_number,
        vehicle_type: toll.vehicles?.vehicle_type,
        exit_time: toll.journeys?.exit_time,
        description: toll.description
      }));

      return summary;

    } catch (error) {
      console.error('Error getting pending toll summary:', error);
      throw error;
    }
  }

  /**
   * Simulate toll processing (for testing)
   * @param {Object} params - Simulation parameters
   * @returns {Promise<Object>} - Simulation result
   */
  static async simulateTollProcessing(params) {
    const { userId, vehicleId, distanceKm, vehicleType, tollRoadId } = params;

    try {
      // Calculate what the fare would be
      const fareCalculation = await this.calculateDistanceFare({
        distanceKm,
        vehicleType,
        tollRoadId
      });

      // Check wallet balance
      const wallet = await Wallet.findByUserId(userId);
      const canAfford = wallet && wallet.balance >= fareCalculation.final_fare;

      return {
        simulation: true,
        fare_calculation: fareCalculation,
        wallet_balance: wallet ? wallet.balance : 0,
        can_afford: canAfford,
        balance_after_payment: wallet ? wallet.balance - fareCalculation.final_fare : 0,
        message: canAfford 
          ? 'Payment can be processed'
          : 'Insufficient wallet balance'
      };

    } catch (error) {
      console.error('Error in toll processing simulation:', error);
      throw error;
    }
  }

  /**
   * Get toll processing statistics
   * @param {string} userId - User ID (optional)
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} - Processing statistics
   */
  static async getProcessingStats(userId = null, dateRange = {}) {
    try {
      // This would be implemented based on your specific analytics needs
      const stats = {
        total_transactions: 0,
        total_amount: 0,
        average_fare: 0,
        most_used_vehicle_type: null,
        processing_success_rate: 0,
        date_range: dateRange
      };

      if (userId) {
        const userStats = await Transaction.getStats(userId, dateRange);
        stats.user_specific = userStats;
      }

      return stats;

    } catch (error) {
      console.error('Error getting processing stats:', error);
      throw error;
    }
  }

  /**
   * Cancel pending toll transactions (for emergencies)
   * @param {Array} transactionIds - Array of transaction IDs to cancel
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} - Cancellation result
   */
  static async cancelPendingTolls(transactionIds, reason = 'Cancelled by system') {
    try {
      const results = [];

      for (const transactionId of transactionIds) {
        try {
          const cancelledTransaction = await Transaction.cancel(transactionId, reason);
          results.push({
            transaction_id: transactionId,
            success: true,
            cancelled_transaction: cancelledTransaction
          });
        } catch (error) {
          results.push({
            transaction_id: transactionId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        cancelled_count: successCount,
        failed_count: results.length - successCount,
        results
      };

    } catch (error) {
      console.error('Error cancelling pending tolls:', error);
      throw error;
    }
  }
}

module.exports = TollProcessingService;