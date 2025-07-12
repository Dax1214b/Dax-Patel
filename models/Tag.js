const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [2, 'Tag name must be at least 2 characters long'],
    maxlength: [30, 'Tag name cannot exceed 30 characters'],
    match: [/^[a-z0-9-]+$/, 'Tag name can only contain lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  usageCount: {
    type: Number,
    default: 0
  },
  questionsCount: {
    type: Number,
    default: 0
  },
  isModerated: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  synonyms: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  relatedTags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
tagSchema.index({ name: 1 });
tagSchema.index({ usageCount: -1 });
tagSchema.index({ questionsCount: -1 });
tagSchema.index({ isFeatured: 1 });
tagSchema.index({ lastUsed: -1 });

// Virtual for tag URL
tagSchema.virtual('url').get(function() {
  return `/tags/${this.name}`;
});

// Method to increment usage
tagSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Method to decrement usage
tagSchema.methods.decrementUsage = function() {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
  }
  return this.save();
};

// Method to update questions count
tagSchema.methods.updateQuestionsCount = function() {
  return mongoose.model('Question').countDocuments({ tags: this.name })
    .then(count => {
      this.questionsCount = count;
      return this.save();
    });
};

// Method to add synonym
tagSchema.methods.addSynonym = function(synonym) {
  if (!this.synonyms.includes(synonym)) {
    this.synonyms.push(synonym);
  }
  return this.save();
};

// Method to remove synonym
tagSchema.methods.removeSynonym = function(synonym) {
  this.synonyms = this.synonyms.filter(s => s !== synonym);
  return this.save();
};

// Method to add related tag
tagSchema.methods.addRelatedTag = function(tagId) {
  if (!this.relatedTags.includes(tagId)) {
    this.relatedTags.push(tagId);
  }
  return this.save();
};

// Method to remove related tag
tagSchema.methods.removeRelatedTag = function(tagId) {
  this.relatedTags = this.relatedTags.filter(id => id.toString() !== tagId.toString());
  return this.save();
};

// Static method to find or create tag
tagSchema.statics.findOrCreate = function(tagName) {
  return this.findOne({ name: tagName.toLowerCase() })
    .then(tag => {
      if (tag) {
        return tag.incrementUsage();
      } else {
        return this.create({ name: tagName.toLowerCase() });
      }
    });
};

// Static method to find popular tags
tagSchema.statics.findPopular = function(limit = 10) {
  return this.find({ isModerated: false })
    .sort({ usageCount: -1, lastUsed: -1 })
    .limit(limit);
};

// Static method to find featured tags
tagSchema.statics.findFeatured = function() {
  return this.find({ isFeatured: true })
    .sort({ usageCount: -1 });
};

// Static method to search tags
tagSchema.statics.search = function(query, options = {}) {
  const { page = 1, limit = 20, sortBy = 'usageCount', sortOrder = 'desc' } = options;
  
  const searchQuery = {
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { synonyms: { $in: [new RegExp(query, 'i')] } }
    ]
  };
  
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return this.find(searchQuery)
    .sort(sortOptions)
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to get tag statistics
tagSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalTags: { $sum: 1 },
        totalUsage: { $sum: '$usageCount' },
        totalQuestions: { $sum: '$questionsCount' },
        averageUsage: { $avg: '$usageCount' },
        featuredTags: {
          $sum: { $cond: ['$isFeatured', 1, 0] }
        },
        moderatedTags: {
          $sum: { $cond: ['$isModerated', 1, 0] }
        }
      }
    }
  ]);
};

// Static method to update all tag question counts
tagSchema.statics.updateAllQuestionCounts = function() {
  return this.find()
    .then(tags => {
      const updatePromises = tags.map(tag => tag.updateQuestionsCount());
      return Promise.all(updatePromises);
    });
};

// Pre-save middleware to validate tag name
tagSchema.pre('save', function(next) {
  // Ensure tag name is lowercase and trimmed
  this.name = this.name.toLowerCase().trim();
  
  // Validate tag name format
  if (!/^[a-z0-9-]+$/.test(this.name)) {
    return next(new Error('Tag name can only contain lowercase letters, numbers, and hyphens'));
  }
  
  // Prevent reserved tag names
  const reservedNames = ['admin', 'moderator', 'system', 'help', 'about', 'contact'];
  if (reservedNames.includes(this.name)) {
    return next(new Error('This tag name is reserved and cannot be used'));
  }
  
  next();
});

module.exports = mongoose.model('Tag', tagSchema); 