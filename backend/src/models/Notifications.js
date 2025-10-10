const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

class Notifications {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.user_id - User ID
   * @param {string} notificationData.type - Notification type
   * @param {string} notificationData.title - Notification title
   * @param {string} notificationData.message - Notification message
   * @param {Object} notificationData.data - Additional data (optional)
   * @param {string} notificationData.priority - Priority level (optional)
   * @returns {Promise<Object>} - Created notification
   */
  static async create(notificationData) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...notificationData,
        priority: notificationData.priority || 'medium',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
    
    console.log('Notification created:', data);
    return data;
  }

  /**
   * Create toll transaction notification
   * @param {string} userId - User ID
   * @param {Object} tollData - Toll transaction data
   * @returns {Promise<Object>} - Created notification
   */
  static async createTollTransactionNotification(userId, tollData) {
    return this.create({
      user_id: userId,
      type: 'toll_transaction',
      title: 'Toll Charged',
      message: `₹${tollData.tollAmount.toFixed(2)} charged for ${tollData.distanceKm.toFixed(1)}km travel. Device: ${tollData.deviceId}`,
      data: {
        device_id: tollData.deviceId,
        distance_km: tollData.distanceKm,
        toll_amount: tollData.tollAmount,
        transaction_time: tollData.timestamp
      },
      priority: 'medium'
    });
  }

  /**
   * Create low wallet balance notification
   * @param {string} userId - User ID
   * @param {number} currentBalance - Current wallet balance
   * @param {number} threshold - Low balance threshold
   * @returns {Promise<Object>} - Created notification
   */
  static async createLowBalanceNotification(userId, currentBalance, threshold = 100) {
    return this.create({
      user_id: userId,
      type: 'low_balance',
      title: 'Low Wallet Balance',
      message: `Your wallet balance is ₹${currentBalance.toFixed(2)}. Please recharge to avoid toll payment issues.`,
      data: {
        current_balance: currentBalance,
        threshold: threshold,
        suggested_recharge: Math.max(500, threshold * 2)
      },
      priority: 'high'
    });
  }

  /**
   * Create insufficient balance notification
   * @param {string} userId - User ID
   * @param {Object} tollData - Toll charge data
   * @returns {Promise<Object>} - Created notification
   */
  static async createInsufficientBalanceNotification(userId, tollData) {
    return this.create({
      user_id: userId,
      type: 'insufficient_balance',
      title: 'Toll Payment Failed',
      message: `Insufficient balance for ₹${tollData.tollAmount.toFixed(2)} toll charge. Please recharge your wallet.`,
      data: {
        required_amount: tollData.tollAmount,
        current_balance: tollData.currentBalance,
        shortage: tollData.tollAmount - tollData.currentBalance,
        device_id: tollData.deviceId,
        distance_km: tollData.distanceKm
      },
      priority: 'critical'
    });
  }

  /**
   * Create wallet recharge notification
   * @param {string} userId - User ID
   * @param {number} amount - Recharge amount
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} - Created notification
   */
  static async createRechargeNotification(userId, amount, transactionId) {
    return this.create({
      user_id: userId,
      type: 'wallet_recharge',
      title: 'Wallet Recharged',
      message: `₹${amount.toFixed(2)} has been added to your wallet successfully.`,
      data: {
        amount: amount,
        transaction_id: transactionId,
        recharge_time: new Date().toISOString()
      },
      priority: 'medium'
    });
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of notifications to return
   * @param {number} options.offset - Number of records to skip
   * @param {boolean} options.unreadOnly - Only return unread notifications
   * @param {string} options.type - Filter by notification type
   * @returns {Promise<Array>} - Array of notifications
   */
  static async getUserNotifications(userId, { 
    limit = 20, 
    offset = 0, 
    unreadOnly = false, 
    type = null 
  } = {}) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<Object>} - Updated notification
   */
  static async markAsRead(notificationId, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Number of notifications marked as read
   */
  static async markAllAsRead(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id');
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
    
    return data ? data.length : 0;
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Count of unread notifications
   */
  static async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) {
      console.error('Error getting unread notification count:', error);
      throw error;
    }
    
    return count || 0;
  }

  /**
   * Delete old notifications
   * @param {number} daysOld - Delete notifications older than this many days
   * @returns {Promise<number>} - Number of notifications deleted
   */
  static async cleanupOldNotifications(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
    
    const deletedCount = data ? data.length : 0;
    console.log(`Cleaned up ${deletedCount} notifications older than ${daysOld} days`);
    return deletedCount;
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  static async delete(notificationId, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('id');
    
    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
    
    return data && data.length > 0;
  }

  /**
   * Get notification statistics by type for a user
   * @param {string} userId - User ID
   * @param {number} daysBack - Days to look back for statistics
   * @returns {Promise<Object>} - Notification statistics
   */
  static async getUserNotificationStats(userId, daysBack = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('notifications')
      .select('type, priority, is_read')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());
    
    if (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }

    const stats = {
      total: data.length,
      unread: data.filter(n => !n.is_read).length,
      by_type: {},
      by_priority: {}
    };

    data.forEach(notification => {
      // Count by type
      stats.by_type[notification.type] = (stats.by_type[notification.type] || 0) + 1;
      
      // Count by priority
      stats.by_priority[notification.priority] = (stats.by_priority[notification.priority] || 0) + 1;
    });

    return stats;
  }
}

module.exports = Notifications;