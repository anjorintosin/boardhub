const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a list title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
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
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#0079bf'
  },
  settings: {
    allowCardCreation: {
      type: Boolean,
      default: true
    },
    allowCardEditing: {
      type: Boolean,
      default: true
    },
    allowCardDeletion: {
      type: Boolean,
      default: true
    },
    allowCardMoving: {
      type: Boolean,
      default: true
    },
    maxCards: {
      type: Number,
      default: null,
      min: 1
    }
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

// Virtual for list cards
listSchema.virtual('cards', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'list',
  options: { sort: { order: 1 } }
});

// Virtual for cards count
listSchema.virtual('cardsCount', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'list',
  count: true
});

// Indexes
listSchema.index({ board: 1, order: 1 });
listSchema.index({ board: 1, isArchived: 1 });
listSchema.index({ createdBy: 1 });

// Auto-increment order for new lists in the same board
listSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastList = await this.constructor.findOne(
      { board: this.board },
      {},
      { sort: { order: -1 } }
    );
    this.order = lastList ? lastList.order + 1 : 0;
  }
  next();
});

// Instance method to get list summary
listSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    order: this.order,
    color: this.color,
    isArchived: this.isArchived,
    settings: this.settings,
    board: this.board,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to reorder lists
listSchema.statics.reorderLists = async function(boardId, listOrders) {
  const updates = listOrders.map(({ listId, order }) => ({
    updateOne: {
      filter: { _id: listId, board: boardId },
      update: { order }
    }
  }));

  return await this.bulkWrite(updates);
};

module.exports = mongoose.model('List', listSchema); 