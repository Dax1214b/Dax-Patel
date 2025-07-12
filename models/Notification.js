const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'answer_received',
      'comment_received',
      'answer_accepted',
      'question_voted',
      'answer_voted',
      'mention',
      'bounty_awarded',
      'badge_earned',
      'question_closed',
      'answer_deleted'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  data: {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    answerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer'
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId
    },
    badgeName: String,
    bountyAmount: Number,
    voteType: {
      type: String,
      enum: ['upvote', 'downvote']
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.createdAt) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to mark as unread
notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

// Method to soft delete
notificationSchema.methods.softDelete = function() {
  this.isDeleted = true;
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = function(data) {
  return this.create(data);
};

// Static method to find unread notifications count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false
  });
};

// Static method to find notifications for user
notificationSchema.statics.findForUser = function(userId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  
  let query = {
    recipient: userId,
    isDeleted: false
  };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  return this.find(query)
    .populate('sender', 'username avatar')
    .populate('data.questionId', 'title')
    .populate('data.answerId', 'content')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to mark all notifications as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      recipient: userId,
      isRead: false,
      isDeleted: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

// Static method to delete old notifications
notificationSchema.statics.deleteOldNotifications = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

// Pre-save middleware to validate notification data
notificationSchema.pre('save', function(next) {
  // Validate that required data fields are present based on notification type
  switch (this.type) {
    case 'answer_received':
    case 'answer_accepted':
    case 'answer_voted':
    case 'answer_deleted':
      if (!this.data.questionId || !this.data.answerId) {
        return next(new Error('Question ID and Answer ID are required for answer-related notifications'));
      }
      break;
    case 'comment_received':
      if (!this.data.questionId || !this.data.answerId || !this.data.commentId) {
        return next(new Error('Question ID, Answer ID, and Comment ID are required for comment notifications'));
      }
      break;
    case 'question_voted':
      if (!this.data.questionId) {
        return next(new Error('Question ID is required for question vote notifications'));
      }
      break;
    case 'mention':
      if (!this.data.questionId && !this.data.answerId) {
        return next(new Error('Question ID or Answer ID is required for mention notifications'));
      }
      break;
    case 'badge_earned':
      if (!this.data.badgeName) {
        return next(new Error('Badge name is required for badge notifications'));
      }
      break;
    case 'bounty_awarded':
      if (!this.data.questionId || !this.data.bountyAmount) {
        return next(new Error('Question ID and bounty amount are required for bounty notifications'));
      }
      break;
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema); 