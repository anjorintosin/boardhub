const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a card title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  color: {
    type: String,
    default: null
  },
  labels: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [20, 'Label name cannot be more than 20 characters']
    },
    color: {
      type: String,
      required: true,
      default: '#0079bf'
    }
  }],
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dueDate: {
    type: Date,
    default: null
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  checklists: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Checklist title cannot be more than 100 characters']
    },
    items: [{
      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Checklist item text cannot be more than 200 characters']
      },
      isCompleted: {
        type: Boolean,
        default: false
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      completedAt: {
        type: Date,
        default: null
      }
    }]
  }],
  comments: [{
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Comment cannot be more than 1000 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  votes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    value: {
      type: Number,
      enum: [-1, 0, 1], // -1: downvote, 0: neutral, 1: upvote
      default: 1
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for vote count
cardSchema.virtual('voteCount').get(function() {
  return (this.votes || []).reduce((sum, vote) => sum + vote.value, 0);
});

// Virtual for completed checklist items count
cardSchema.virtual('completedChecklistItems').get(function() {
  return (this.checklists || []).reduce((sum, checklist) => 
    sum + (checklist.items || []).filter(item => item.isCompleted).length, 0
  );
});

// Virtual for total checklist items count
cardSchema.virtual('totalChecklistItems').get(function() {
  return (this.checklists || []).reduce((sum, checklist) => 
    sum + (checklist.items || []).length, 0
  );
});

// Indexes
cardSchema.index({ list: 1, order: 1 });
cardSchema.index({ board: 1 });
cardSchema.index({ assignees: 1 });
cardSchema.index({ dueDate: 1 });
cardSchema.index({ isCompleted: 1 });
cardSchema.index({ priority: 1 });
cardSchema.index({ isArchived: 1 });
cardSchema.index({ createdBy: 1 });
cardSchema.index({ title: 'text', description: 'text' });

// Auto-increment order for new cards in the same list
cardSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastCard = await this.constructor.findOne(
      { list: this.list },
      {},
      { sort: { order: -1 } }
    );
    this.order = lastCard ? lastCard.order + 1 : 0;
  }
  next();
});

// Instance method to get card summary
cardSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    order: this.order,
    color: this.color,
    labels: this.labels,
    assignees: this.assignees,
    dueDate: this.dueDate,
    isCompleted: this.isCompleted,
    priority: this.priority,
    voteCount: this.voteCount,
    completedChecklistItems: this.completedChecklistItems,
    totalChecklistItems: this.totalChecklistItems,
    attachmentsCount: this.attachments.length,
    commentsCount: this.comments.length,
    isArchived: this.isArchived,
    list: this.list,
    board: this.board,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to reorder cards
cardSchema.statics.reorderCards = async function(listId, cardOrders) {
  const updates = cardOrders.map(({ cardId, order }) => ({
    updateOne: {
      filter: { _id: cardId, list: listId },
      update: { order }
    }
  }));

  return await this.bulkWrite(updates);
};

// Instance method to add vote
cardSchema.methods.addVote = function(userId, value) {
  const existingVoteIndex = this.votes.findIndex(vote => 
    vote.user.toString() === userId.toString()
  );

  if (existingVoteIndex > -1) {
    this.votes[existingVoteIndex].value = value;
    this.votes[existingVoteIndex].createdAt = new Date();
  } else {
    this.votes.push({ user: userId, value });
  }

  return this.save();
};

// Instance method to add comment
cardSchema.methods.addComment = function(userId, text) {
  this.comments.push({
    text,
    author: userId
  });

  return this.save();
};

module.exports = mongoose.model('Card', cardSchema); 