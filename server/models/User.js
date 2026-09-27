const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: [100, 'Name cannot exceed 100 characters'] },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'] },
    password: { type: String, minlength: [8, 'Password must be at least 8 characters'], select: false },
    avatar: { type: String, default: null },
    role: { type: String, enum: ['attendee', 'organizer', 'admin'], default: 'attendee' },
    googleId: { type: String, unique: true, sparse: true },
    isVerified: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },

    // Organizer approval fields
    approved: { type: Boolean, default: false },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    organizationName: { type: String, default: '' },
    organizationType: { type: String, default: '' },
    phone: { type: String, default: '' },
    bio: { type: String, default: '', trim: true, maxlength: [300, 'Bio cannot exceed 300 characters'] },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    website: { type: String, default: '' },
    aboutOrganization: { type: String, default: '' },
    // Social links
    social: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    // Bank / payout details
    bank: {
      accountHolder: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      upi: { type: String, default: '' },
      accountType: { type: String, default: '' },
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectedReason: { type: String, default: '' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
