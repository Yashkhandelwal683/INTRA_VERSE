const mongoose = require('mongoose');

const eventStaffSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['co_organizer', 'check_in_staff', 'content_manager', 'viewer'],
      default: 'viewer',
    },
    permissions: {
      canEditEvent: { type: Boolean, default: false },
      canManageRegistrations: { type: Boolean, default: false },
      canManageTickets: { type: Boolean, default: false },
      canCheckIn: { type: Boolean, default: false },
      canViewRevenue: { type: Boolean, default: false },
      canManageContent: { type: Boolean, default: false },
      canSendAnnouncements: { type: Boolean, default: false },
      canManageTeam: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'removed'],
      default: 'pending',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: Date,
    removedAt: Date,
  },
  { timestamps: true }
);

eventStaffSchema.index({ event: 1, user: 1 }, { unique: true });

const ROLE_PERMISSIONS = {
  co_organizer: {
    canEditEvent: true,
    canManageRegistrations: true,
    canManageTickets: true,
    canCheckIn: true,
    canViewRevenue: true,
    canManageContent: true,
    canSendAnnouncements: true,
    canManageTeam: false,
  },
  check_in_staff: {
    canEditEvent: false,
    canManageRegistrations: false,
    canManageTickets: false,
    canCheckIn: true,
    canViewRevenue: false,
    canManageContent: false,
    canSendAnnouncements: false,
    canManageTeam: false,
  },
  content_manager: {
    canEditEvent: true,
    canManageRegistrations: false,
    canManageTickets: false,
    canCheckIn: false,
    canViewRevenue: false,
    canManageContent: true,
    canSendAnnouncements: true,
    canManageTeam: false,
  },
  viewer: {
    canEditEvent: false,
    canManageRegistrations: false,
    canManageTickets: false,
    canCheckIn: false,
    canViewRevenue: true,
    canManageContent: false,
    canSendAnnouncements: false,
    canManageTeam: false,
  },
};

eventStaffSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('role')) {
    this.permissions = ROLE_PERMISSIONS[this.role] || ROLE_PERMISSIONS.viewer;
  }
  next();
});

eventStaffSchema.statics.ROLE_PERMISSIONS = ROLE_PERMISSIONS;

module.exports = mongoose.model('EventStaff', eventStaffSchema);
