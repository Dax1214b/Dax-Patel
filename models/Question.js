const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Question title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Question description is required'],
    minlength: [20, 'Description must be at least 20 characters long']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    required: true,
    trim: true,
    lowercase: true
  }],
  votes: {
    upvotes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    downvotes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  views: {
    type: Number,
    default: 0
  },
  answers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  }],
  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer',
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'duplicate', 'on-hold'],
    default: 'open'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    editedAt: {
      type: Date,
      default: Date.now
    },
    previousContent: {
      title: String,
      description: String,
      tags: [String]
    }
  }],
  bounty: {
    amount: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
questionSchema.index({ title: 'text', description: 'text' });
questionSchema.index({ tags: 1 });
questionSchema.index({ author: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ lastActivity: -1 });
questionSchema.index({ 'votes.upvotes': -1 });
questionSchema.index({ views: -1 });

// Virtual for vote count
questionSchema.virtual('voteCount').get(function() {
  return this.votes.upvotes.length - this.votes.downvotes.length;
});

// Virtual for answer count
questionSchema.virtual('answerCount').get(function() {
  return this.answers.length;
});

// Virtual for isAnswered
questionSchema.virtual('isAnswered').get(function() {
  return this.acceptedAnswer !== null;
});

// Pre-save middleware to update lastActivity
questionSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// Method to add vote
questionSchema.methods.addVote = function(userId, voteType) {
  const upvoteIndex = this.votes.upvotes.findIndex(vote => vote.user.toString() === userId.toString());
  const downvoteIndex = this.votes.downvotes.findIndex(vote => vote.user.toString() === userId.toString());
  
  // Remove existing vote if any
  if (upvoteIndex > -1) {
    this.votes.upvotes.splice(upvoteIndex, 1);
  }
  if (downvoteIndex > -1) {
    this.votes.downvotes.splice(downvoteIndex, 1);
  }
  
  // Add new vote
  if (voteType === 'upvote') {
    this.votes.upvotes.push({ user: userId });
  } else if (voteType === 'downvote') {
    this.votes.downvotes.push({ user: userId });
  }
  
  return this.save();
};

// Method to increment views
questionSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to add answer
questionSchema.methods.addAnswer = function(answerId) {
  if (!this.answers.includes(answerId)) {
    this.answers.push(answerId);
    this.lastActivity = new Date();
  }
  return this.save();
};

// Method to remove answer
questionSchema.methods.removeAnswer = function(answerId) {
  this.answers = this.answers.filter(id => id.toString() !== answerId.toString());
  if (this.acceptedAnswer && this.acceptedAnswer.toString() === answerId.toString()) {
    this.acceptedAnswer = null;
  }
  return this.save();
};

// Method to accept answer
questionSchema.methods.acceptAnswer = function(answerId) {
  if (this.answers.includes(answerId)) {
    this.acceptedAnswer = answerId;
    this.lastActivity = new Date();
  }
  return this.save();
};

// Static method to search questions
questionSchema.statics.search = function(query, options = {}) {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', tags, author } = options;
  
  let searchQuery = {};
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  if (tags && tags.length > 0) {
    searchQuery.tags = { $in: tags };
  }
  
  if (author) {
    searchQuery.author = author;
  }
  
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return this.find(searchQuery)
    .populate('author', 'username avatar reputation')
    .populate('acceptedAnswer')
    .sort(sortOptions)
    .skip((page - 1) * limit)
    .limit(limit);
};

module.exports = mongoose.model('Question', questionSchema); 