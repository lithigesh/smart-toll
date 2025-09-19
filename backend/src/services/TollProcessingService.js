const VehicleTollHistory = require('../models/VehicleTollHistory');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Notifications = require('../models/Notifications');
const DistanceCalculationService = require('./DistanceCalculationService');
const GpsLog = require('../models/GpsLog');

class TollProcessingService {
  /**
   * Process a toll charge for a completed toll journey
   * @param {Object} params - Processing parameters
   * @param {string} params.tollHistoryId - Toll history ID
   * @param {string} params.userId - User ID
   * @param {string} params.vehicleId - Vehicle ID
   * @param {number} params.distanceKm - Distance traveled
   * @param {number} params.ratePerKm - Rate per kilometer
   * @param {Object} params.zoneInfo - Toll zone information
   * @returns {Promise<Object>} - Processing result
   */
  static async processTollCharge(params) {
    const {
      tollHistoryId,
      userId,
      vehicleId,
      distanceKm,
      ratePerKm,
      zoneInfo
    } = params;

    try {
      // Calculate fare with options
      const fareOptions = {
        minimumFare: zoneInfo.minimum_fare || 5,
        roundingFactor: 0.5,
        taxPercentage: zoneInfo.tax_percentage || 0,
        discountPercentage: await this.calculateDiscount(userId, vehicleId)
      };

      const fareCalculation = DistanceCalculationService.calculateFare(
        distanceKm,
        ratePerKm,
        fareOptions
      );

      // Get user wallet
      const wallet = await Wallet.findByUserId(userId);
      if (!wallet) {
        throw new Error('User wallet not found');
      }

      // Check sufficient balance
      if (wallet.balance < fareCalculation.finalFare) {
        return await this.handleInsufficientBalance({
          userId,
          vehicleId,
          tollHistoryId,
          requiredAmount: fareCalculation.finalFare,
          currentBalance: wallet.balance,
          zoneInfo
        });
      }

      // Process payment
      const paymentResult = await this.processPayment({
        userId,
        amount: fareCalculation.finalFare,
        tollHistoryId,
        fareCalculation,
        zoneInfo
      });

      // Send success notification
      await Notifications.createTollExitNotification(userId, {
        zoneId: zoneInfo.id,
        zoneName: zoneInfo.name,
        distanceKm: distanceKm,
        fareAmount: fareCalculation.finalFare,
        exitTime: new Date().toISOString(),
        vehicleId: vehicleId,
        tollHistoryId: tollHistoryId
      });

      // Check for low balance warning
      if (paymentResult.newBalance < 100) {
        await Notifications.createLowBalanceNotification(
          userId, 
          paymentResult.newBalance, 
          100
        );
      }

      return {
        success: true,
        tollHistoryId,
        fareCalculation,
        paymentResult,
        balanceWarning: paymentResult.newBalance < 100
      };

    } catch (error) {
      console.error('Error processing toll charge:', error);
      
      // Send error notification
      await Notifications.create({
        user_id: userId,
        type: 'toll_processing_error',
        title: 'Toll Processing Error',
        message: `Failed to process toll charge for ${zoneInfo.name}. Please contact support.`,
        data: {
          error: error.message,
          toll_history_id: tollHistoryId,
          vehicle_id: vehicleId,
          zone_name: zoneInfo.name
        },
        priority: 'critical'
      });

      return {
        success: false,
        error: error.message,
        tollHistoryId
      };
    }
  }

  /**
   * Process payment from wallet
   * @param {Object} params - Payment parameters
   * @returns {Promise<Object>} - Payment result
   */
  static async processPayment(params) {
    const { userId, amount, tollHistoryId, fareCalculation, zoneInfo } = params;

    try {
      // Get current balance
      const wallet = await Wallet.findByUserId(userId);
      const previousBalance = wallet.balance;

      // Deduct amount from wallet
      await Wallet.deductAmount(userId, amount, `Toll charge - ${zoneInfo.name}`);

      // Create transaction record
      const transaction = await Transaction.create({
        user_id: userId,
        type: 'toll_charge',
        amount: amount,
        status: 'completed',
        reference_id: tollHistoryId,
        description: `Toll charge for ${zoneInfo.name} - ${fareCalculation.distance}km @ ₹${fareCalculation.ratePerKm}/km`,
        metadata: {
          toll_history_id: tollHistoryId,
          zone_id: zoneInfo.id,
          zone_name: zoneInfo.name,
          distance_km: fareCalculation.distance,
          rate_per_km: fareCalculation.ratePerKm,
          base_fare: fareCalculation.baseFare,
          tax_amount: fareCalculation.taxAmount,
          final_fare: fareCalculation.finalFare,
          discount_percentage: fareCalculation.discount
        }
      });

      // Get updated balance
      const updatedWallet = await Wallet.findByUserId(userId);

      return {
        success: true,
        transactionId: transaction.id,
        previousBalance: previousBalance,
        newBalance: updatedWallet.balance,
        amountDeducted: amount
      };

    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Handle insufficient balance scenario
   * @param {Object} params - Insufficient balance parameters
   * @returns {Promise<Object>} - Handling result
   */
  static async handleInsufficientBalance(params) {
    const {
      userId,
      vehicleId,
      tollHistoryId,
      requiredAmount,
      currentBalance,
      zoneInfo
    } = params;

    try {
      // Create insufficient balance notification
      const notification = await Notifications.createInsufficientBalanceNotification(userId, {
        fareAmount: requiredAmount,
        currentBalance: currentBalance,
        zoneId: zoneInfo.id,
        zoneName: zoneInfo.name,
        vehicleId: vehicleId
      });

      // Create pending transaction
      const pendingTransaction = await Transaction.create({
        user_id: userId,
        type: 'toll_charge_pending',
        amount: requiredAmount,
        status: 'pending',
        reference_id: tollHistoryId,
        description: `Pending toll charge - ${zoneInfo.name} (Insufficient balance)`,
        metadata: {
          toll_history_id: tollHistoryId,
          zone_id: zoneInfo.id,
          zone_name: zoneInfo.name,
          required_amount: requiredAmount,
          current_balance: currentBalance,
          shortage: requiredAmount - currentBalance
        }
      });

      // Mark toll history as payment pending
      // This might require updating the VehicleTollHistory model to support this status

      return {
        success: false,
        error: 'Insufficient balance',
        requiredAmount: requiredAmount,
        currentBalance: currentBalance,
        shortage: requiredAmount - currentBalance,
        pendingTransactionId: pendingTransaction.id,
        notification: notification,
        suggestedRecharge: Math.ceil((requiredAmount - currentBalance + 100) / 100) * 100 // Round up to nearest 100
      };

    } catch (error) {
      console.error('Error handling insufficient balance:', error);
      throw error;
    }
  }

  /**
   * Calculate discount percentage for a user/vehicle
   * @param {string} userId - User ID
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<number>} - Discount percentage
   */
  static async calculateDiscount(userId, vehicleId) {
    try {
      // Example discount logic - could be based on:
      // - User subscription type
      // - Frequent traveler benefits
      // - Vehicle type (electric vehicles get discount)
      // - Time of day
      // - Promotional campaigns

      // For now, return 0% discount
      // In a real implementation, you might query user profile, vehicle type, etc.
      
      return 0; // No discount by default

    } catch (error) {
      console.error('Error calculating discount:', error);
      return 0; // Default to no discount on error
    }
  }

  /**
   * Retry pending toll payments after wallet recharge
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of retry results
   */
  static async retryPendingPayments(userId) {
    try {
      // Get pending toll transactions
      const pendingTransactions = await Transaction.findByUserAndType(
        userId, 
        'toll_charge_pending',
        { status: 'pending' }
      );

      const retryResults = [];

      for (const transaction of pendingTransactions) {
        try {
          const tollHistoryId = transaction.reference_id;
          const metadata = transaction.metadata;

          // Get updated wallet balance
          const wallet = await Wallet.findByUserId(userId);

          if (wallet.balance >= transaction.amount) {
            // Sufficient balance now - process payment
            const paymentResult = await this.processPayment({
              userId,
              amount: transaction.amount,
              tollHistoryId,
              fareCalculation: {
                distance: metadata.distance_km,
                ratePerKm: metadata.rate_per_km,
                baseFare: metadata.base_fare,
                taxAmount: metadata.tax_amount,
                finalFare: metadata.final_fare,
                discount: metadata.discount_percentage
              },
              zoneInfo: {
                id: metadata.zone_id,
                name: metadata.zone_name
              }
            });

            // Mark original pending transaction as completed
            await Transaction.updateStatus(transaction.id, 'completed');

            // Send success notification
            await Notifications.create({
              user_id: userId,
              type: 'toll_payment_retry_success',
              title: 'Pending Toll Payment Processed',
              message: `₹${transaction.amount.toFixed(2)} toll charge for ${metadata.zone_name} has been processed.`,
              data: {
                original_transaction_id: transaction.id,
                new_transaction_id: paymentResult.transactionId,
                zone_name: metadata.zone_name,
                amount: transaction.amount
              },
              priority: 'medium'
            });

            retryResults.push({
              success: true,
              transactionId: transaction.id,
              amount: transaction.amount,
              zoneName: metadata.zone_name
            });

          } else {
            // Still insufficient balance
            retryResults.push({
              success: false,
              transactionId: transaction.id,
              amount: transaction.amount,
              zoneName: metadata.zone_name,
              shortage: transaction.amount - wallet.balance
            });
          }

        } catch (error) {
          console.error(`Error retrying payment for transaction ${transaction.id}:`, error);
          retryResults.push({
            success: false,
            transactionId: transaction.id,
            error: error.message
          });
        }
      }

      return retryResults;

    } catch (error) {
      console.error('Error retrying pending payments:', error);
      throw error;
    }
  }

  /**
   * Get toll processing statistics
   * @param {Object} params - Statistics parameters
   * @returns {Promise<Object>} - Processing statistics
   */
  static async getProcessingStats(params = {}) {
    try {
      const { startDate, endDate, userId = null } = params;

      // This would implement comprehensive toll processing statistics
      // For now, return basic structure

      return {
        totalProcessed: 0,
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        totalRevenue: 0,
        averageFare: 0,
        processingErrors: 0
      };

    } catch (error) {
      console.error('Error getting processing stats:', error);
      throw error;
    }
  }

  /**
   * Force process a toll charge (admin function)
   * @param {Object} params - Force processing parameters
   * @returns {Promise<Object>} - Processing result
   */
  static async forceProcessTollCharge(params) {
    try {
      const { tollHistoryId, adminUserId, reason } = params;

      // Get toll history
      const tollHistory = await VehicleTollHistory.getById(tollHistoryId);
      if (!tollHistory) {
        throw new Error('Toll history not found');
      }

      // This would implement admin override logic
      // For now, just return a placeholder

      return {
        success: true,
        tollHistoryId,
        adminUserId,
        reason,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error force processing toll charge:', error);
      throw error;
    }
  }
}

module.exports = TollProcessingService;