const express = require('express');
const router = express.Router();
const Notifications = require('../models/Notifications');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * GET /api/notifications
 * Get notifications for the authenticated user
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      unread_only = false,
      type = null
    } = req.query;

    const notifications = await Notifications.getUserNotifications(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unread_only === 'true',
      type: type
    });

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notifications'
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notifications.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: {
        unread_count: count
      }
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch unread count'
    });
  }
});

/**
 * PUT /api/notifications/:notification_id/read
 * Mark a notification as read
 */
router.put('/:notification_id/read', authMiddleware, async (req, res) => {
  try {
    const { notification_id } = req.params;

    const notification = await Notifications.markAsRead(notification_id, req.user.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark notification as read'
    });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for the user
 */
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const count = await Notifications.markAllAsRead(req.user.id);

    res.json({
      success: true,
      data: {
        marked_read_count: count
      },
      message: `${count} notifications marked as read`
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark all notifications as read'
    });
  }
});

/**
 * DELETE /api/notifications/:notification_id
 * Delete a notification
 */
router.delete('/:notification_id', authMiddleware, async (req, res) => {
  try {
    const { notification_id } = req.params;

    const deleted = await Notifications.delete(notification_id, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete notification'
    });
  }
});

/**
 * POST /api/notifications/test
 * Create a test notification (development/testing only)
 */
router.post('/test', authMiddleware, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test endpoints not available in production'
      });
    }

    const { type = 'test', title = 'Test Notification', message = 'This is a test notification' } = req.body;

    const notification = await Notifications.create({
      user_id: req.user.id,
      type: type,
      title: title,
      message: message,
      data: {
        test: true,
        created_by: 'api_test',
        timestamp: new Date().toISOString()
      },
      priority: 'low'
    });

    res.json({
      success: true,
      data: notification,
      message: 'Test notification created'
    });

  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create test notification'
    });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics for the user
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { days_back = 30 } = req.query;

    const stats = await Notifications.getUserNotificationStats(
      req.user.id,
      parseInt(days_back)
    );

    res.json({
      success: true,
      data: {
        days_back: parseInt(days_back),
        ...stats
      }
    });

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notification statistics'
    });
  }
});

/**
 * POST /api/notifications/send-toll-entry
 * Send a toll entry notification (testing/admin)
 */
router.post('/send-toll-entry', authMiddleware, async (req, res) => {
  try {
    const { toll_data } = req.body;

    if (!toll_data || !toll_data.zoneName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required toll_data with zoneName'
      });
    }

    const notification = await Notifications.createTollEntryNotification(req.user.id, {
      zoneId: toll_data.zoneId || 'test-zone',
      zoneName: toll_data.zoneName,
      ratePerKm: toll_data.ratePerKm || 10,
      entryTime: toll_data.entryTime || new Date().toISOString(),
      vehicleId: toll_data.vehicleId || 'test-vehicle'
    });

    res.json({
      success: true,
      data: notification,
      message: 'Toll entry notification sent'
    });

  } catch (error) {
    console.error('Error sending toll entry notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send toll entry notification'
    });
  }
});

/**
 * POST /api/notifications/send-toll-exit
 * Send a toll exit notification (testing/admin)
 */
router.post('/send-toll-exit', authMiddleware, async (req, res) => {
  try {
    const { toll_data } = req.body;

    if (!toll_data || !toll_data.zoneName || !toll_data.fareAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required toll_data with zoneName and fareAmount'
      });
    }

    const notification = await Notifications.createTollExitNotification(req.user.id, {
      zoneId: toll_data.zoneId || 'test-zone',
      zoneName: toll_data.zoneName,
      distanceKm: toll_data.distanceKm || 5,
      fareAmount: parseFloat(toll_data.fareAmount),
      exitTime: toll_data.exitTime || new Date().toISOString(),
      vehicleId: toll_data.vehicleId || 'test-vehicle',
      tollHistoryId: toll_data.tollHistoryId || 'test-history'
    });

    res.json({
      success: true,
      data: notification,
      message: 'Toll exit notification sent'
    });

  } catch (error) {
    console.error('Error sending toll exit notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send toll exit notification'
    });
  }
});

/**
 * POST /api/notifications/send-low-balance
 * Send a low balance warning notification
 */
router.post('/send-low-balance', authMiddleware, async (req, res) => {
  try {
    const { current_balance, threshold = 100 } = req.body;

    if (current_balance === undefined || current_balance === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: current_balance'
      });
    }

    const notification = await Notifications.createLowBalanceNotification(
      req.user.id,
      parseFloat(current_balance),
      parseFloat(threshold)
    );

    res.json({
      success: true,
      data: notification,
      message: 'Low balance notification sent'
    });

  } catch (error) {
    console.error('Error sending low balance notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send low balance notification'
    });
  }
});

/**
 * POST /api/notifications/send-recharge
 * Send a wallet recharge notification
 */
router.post('/send-recharge', authMiddleware, async (req, res) => {
  try {
    const { amount, transaction_id } = req.body;

    if (!amount || !transaction_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, transaction_id'
      });
    }

    const notification = await Notifications.createRechargeNotification(
      req.user.id,
      parseFloat(amount),
      transaction_id
    );

    res.json({
      success: true,
      data: notification,
      message: 'Recharge notification sent'
    });

  } catch (error) {
    console.error('Error sending recharge notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send recharge notification'
    });
  }
});

module.exports = router;