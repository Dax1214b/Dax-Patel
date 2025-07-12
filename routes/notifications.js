const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth, userAuth } = require('../middleware/auth');
const { notificationValidation, paginationValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/',
  auth,
  userAuth,
  notificationValidation.list,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const notifications = await Notification.findForUser(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    const total = await Notification.countDocuments({
      recipient: req.user._id,
      isDeleted: false,
      ...(unreadOnly === 'true' && { isRead: false })
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  })
);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get('/unread-count',
  auth,
  userAuth,
  asyncHandler(async (req, res) => {
    const count = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: {
        count
      }
    });
  })
);

// @route   GET /api/notifications/:id
// @desc    Get notification by ID
// @access  Private
router.get('/:id',
  auth,
  userAuth,
  notificationValidation.markRead,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id)
      .populate('sender', 'username avatar')
      .populate('data.questionId', 'title')
      .populate('data.answerId', 'content');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        notification
      }
    });
  })
);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read',
  auth,
  userAuth,
  notificationValidation.markRead,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await notification.markAsRead();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user._id}`).emit('notification_read', {
      notificationId: notification._id,
      unreadCount: await Notification.getUnreadCount(req.user._id)
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  })
);

// @route   PUT /api/notifications/:id/unread
// @desc    Mark notification as unread
// @access  Private
router.put('/:id/unread',
  auth,
  userAuth,
  notificationValidation.markRead,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await notification.markAsUnread();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user._id}`).emit('notification_unread', {
      notificationId: notification._id,
      unreadCount: await Notification.getUnreadCount(req.user._id)
    });

    res.json({
      success: true,
      message: 'Notification marked as unread'
    });
  })
);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all',
  auth,
  userAuth,
  asyncHandler(async (req, res) => {
    await Notification.markAllAsRead(req.user._id);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user._id}`).emit('notifications_read_all', {
      unreadCount: 0
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  })
);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id',
  auth,
  userAuth,
  notificationValidation.markRead,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await notification.softDelete();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user._id}`).emit('notification_deleted', {
      notificationId: notification._id,
      unreadCount: await Notification.getUnreadCount(req.user._id)
    });

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  })
);

// @route   DELETE /api/notifications/clear-read
// @desc    Delete all read notifications
// @access  Private
router.delete('/clear-read',
  auth,
  userAuth,
  asyncHandler(async (req, res) => {
    const result = await Notification.deleteMany({
      recipient: req.user._id,
      isRead: true,
      isDeleted: false
    });

    res.json({
      success: true,
      message: `${result.deletedCount} read notifications deleted`
    });
  })
);

// @route   GET /api/notifications/settings
// @desc    Get notification settings
// @access  Private
router.get('/settings',
  auth,
  userAuth,
  asyncHandler(async (req, res) => {
    const settings = req.user.preferences;

    res.json({
      success: true,
      data: {
        settings
      }
    });
  })
);

// @route   PUT /api/notifications/settings
// @desc    Update notification settings
// @access  Private
router.put('/settings',
  auth,
  userAuth,
  asyncHandler(async (req, res) => {
    const { emailNotifications, pushNotifications } = req.body;

    const updates = {};
    if (emailNotifications !== undefined) {
      updates['preferences.emailNotifications'] = emailNotifications;
    }
    if (pushNotifications !== undefined) {
      updates['preferences.pushNotifications'] = pushNotifications;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        settings: user.preferences
      }
    });
  })
);

// @route   POST /api/notifications/test
// @desc    Send test notification (for development)
// @access  Private
router.post('/test',
  auth,
  userAuth,
  asyncHandler(async (req, res) => {
    const { type = 'mention', title, message } = req.body;

    const notification = await Notification.createNotification({
      recipient: req.user._id,
      sender: req.user._id,
      type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      data: {
        questionId: null,
        answerId: null
      }
    });

    // Emit real-time notification
    const io = req.app.get('io');
    io.to(`user_${req.user._id}`).emit('new_notification', {
      notification,
      unreadCount: await Notification.getUnreadCount(req.user._id)
    });

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: {
        notification
      }
    });
  })
);

// @route   GET /api/notifications/types
// @desc    Get available notification types
// @access  Public
router.get('/types', (req, res) => {
  const types = [
    {
      type: 'answer_received',
      title: 'New Answer',
      description: 'When someone answers your question'
    },
    {
      type: 'comment_received',
      title: 'New Comment',
      description: 'When someone comments on your answer'
    },
    {
      type: 'answer_accepted',
      title: 'Answer Accepted',
      description: 'When your answer is accepted'
    },
    {
      type: 'question_voted',
      title: 'Question Voted',
      description: 'When someone votes on your question'
    },
    {
      type: 'answer_voted',
      title: 'Answer Voted',
      description: 'When someone votes on your answer'
    },
    {
      type: 'mention',
      title: 'Mention',
      description: 'When someone mentions you using @username'
    },
    {
      type: 'bounty_awarded',
      title: 'Bounty Awarded',
      description: 'When you receive a bounty'
    },
    {
      type: 'badge_earned',
      title: 'Badge Earned',
      description: 'When you earn a new badge'
    }
  ];

  res.json({
    success: true,
    data: {
      types
    }
  });
});

module.exports = router; 