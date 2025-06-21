const mongoose = require('mongoose');

const boardMemberSchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer'],
    default: 'viewer'
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  joinedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    canEditBoard: {
      type: Boolean,
      default: false
    },
    canDeleteBoard: {
      type: Boolean,
      default: false
    },
    canInviteMembers: {
      type: Boolean,
      default: false
    },
    canRemoveMembers: {
      type: Boolean,
      default: false
    },
    canCreateLists: {
      type: Boolean,
      default: true
    },
    canEditLists: {
      type: Boolean,
      default: true
    },
    canDeleteLists: {
      type: Boolean,
      default: false
    },
    canCreateCards: {
      type: Boolean,
      default: true
    },
    canEditCards: {
      type: Boolean,
      default: true
    },
    canDeleteCards: {
      type: Boolean,
      default: false
    },
    canMoveCards: {
      type: Boolean,
      default: true
    },
    canComment: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Compound index to ensure unique user-board combinations
boardMemberSchema.index({ board: 1, user: 1 }, { unique: true });
boardMemberSchema.index({ board: 1, role: 1 });
boardMemberSchema.index({ user: 1, isActive: 1 });

// Set permissions based on role
boardMemberSchema.pre('save', function(next) {
  switch (this.role) {
    case 'owner':
      this.permissions = {
        canEditBoard: true,
        canDeleteBoard: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canCreateLists: true,
        canEditLists: true,
        canDeleteLists: true,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: true,
        canMoveCards: true,
        canComment: true
      };
      break;
    case 'admin':
      this.permissions = {
        canEditBoard: true,
        canDeleteBoard: false,
        canInviteMembers: true,
        canRemoveMembers: true,
        canCreateLists: true,
        canEditLists: true,
        canDeleteLists: true,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: true,
        canMoveCards: true,
        canComment: true
      };
      break;
    case 'editor':
      this.permissions = {
        canEditBoard: false,
        canDeleteBoard: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canCreateLists: true,
        canEditLists: true,
        canDeleteLists: false,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: false,
        canMoveCards: true,
        canComment: true
      };
      break;
    case 'viewer':
      this.permissions = {
        canEditBoard: false,
        canDeleteBoard: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canCreateLists: false,
        canEditLists: false,
        canDeleteLists: false,
        canCreateCards: false,
        canEditCards: false,
        canDeleteCards: false,
        canMoveCards: false,
        canComment: false
      };
      break;
  }
  next();
});

// Instance method to check permission
boardMemberSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] || false;
};

// Instance method to get member info
boardMemberSchema.methods.getMemberInfo = function() {
  return {
    id: this._id,
    board: this.board,
    user: this.user,
    role: this.role,
    permissions: this.permissions,
    invitedAt: this.invitedAt,
    joinedAt: this.joinedAt,
    isActive: this.isActive
  };
};

module.exports = mongoose.model('BoardMember', boardMemberSchema); 