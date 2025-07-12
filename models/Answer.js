const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Answer content is required'],
    minlength: [20, 'Answer must be at least 20 characters long']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
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
  isAccepted: {
    type: Boolean,
    default: false
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
    previousContent: String
  }],
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
answerSchema.index({ question: 1, createdAt: -1 });
answerSchema.index({ author: 1 });
answerSchema.index({ isAccepted: 1 });
answerSchema.index({ 'votes.upvotes': -1 });

// Virtual for vote count
answerSchema.virtual('voteCount').get(function() {
  return this.votes.upvotes.length - this.votes.downvotes.length;
});

// Virtual for comment count
answerSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Pre-save middleware
answerSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
  }
  next();
});

// Method to add vote
answerSchema.methods.addVote = function(userId, voteType) {
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

// Method to add comment
answerSchema.methods.addComment = function(authorId, content) {
  this.comments.push({
    author: authorId,
    content: content
  });
  return this.save();
};

// Method to remove comment
answerSchema.methods.removeComment = function(commentId) {
  this.comments = this.comments.filter(comment => comment._id.toString() !== commentId.toString());
  return this.save();
};

// Method to edit comment
answerSchema.methods.editComment = function(commentId, newContent) {
  const comment = this.comments.id(commentId);
  if (comment) {
    comment.content = newContent;
    comment.isEdited = true;
  }
  return this.save();
};

// Method to accept answer
answerSchema.methods.accept = function() {
  this.isAccepted = true;
  return this.save();
};

// Method to unaccept answer
answerSchema.methods.unaccept = function() {
  this.isAccepted = false;
  return this.save();
};

// Method to soft delete
answerSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Method to restore
answerSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

// Static method to find answers by question
answerSchema.statics.findByQuestion = function(questionId, options = {}) {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return this.find({ 
    question: questionId, 
    isDeleted: false 
  })
    .populate('author', 'username avatar reputation')
    .populate('comments.author', 'username avatar')
    .sort(sortOptions)
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to find accepted answer for a question
answerSchema.statics.findAcceptedByQuestion = function(questionId) {
  return this.findOne({ 
    question: questionId, 
    isAccepted: true, 
    isDeleted: false 
  })
    .populate('author', 'username avatar reputation');
};

module.exports = mongoose.model('Answer', answerSchema); 