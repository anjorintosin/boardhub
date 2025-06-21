const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a board title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  background: {
    type: {
      type: String,
      enum: ['color', 'image'],
      default: 'color'
    },
    value: {
      type: String,
      default: '#0079bf'
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowVoting: {
      type: Boolean,
      default: false
    },
    allowSubscriptions: {
      type: Boolean,
      default: true
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot be more than 20 characters']
  }],
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for board lists
boardSchema.virtual('lists', {
  ref: 'List',
  localField: '_id',
  foreignField: 'board',
  options: { sort: { order: 1 } }
});

// Virtual for board members
boardSchema.virtual('members', {
  ref: 'BoardMember',
  localField: '_id',
  foreignField: 'board',
  populate: {
    path: 'user',
    select: 'name email avatar'
  }
});

// Virtual for board cards count
boardSchema.virtual('cardsCount', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'board',
  count: true
});

// Indexes
boardSchema.index({ owner: 1 });
boardSchema.index({ isPublic: 1 });
boardSchema.index({ isArchived: 1 });
boardSchema.index({ lastActivity: -1 });
boardSchema.index({ title: 'text', description: 'text' });

// Update last activity when board is modified
boardSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// Instance method to check if user has access
boardSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  // Owner has all access
  if (this.owner.toString() === userId.toString()) {
    return true;
  }

  // Public boards are viewable by everyone
  if (this.isPublic && requiredRole === 'viewer') {
    return true;
  }

  // For other access, need to check membership
  return false; // Will be populated by middleware
};

// Instance method to get board summary
boardSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    background: this.background,
    isPublic: this.isPublic,
    isArchived: this.isArchived,
    owner: this.owner,
    lastActivity: this.lastActivity,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Board', boardSchema); 