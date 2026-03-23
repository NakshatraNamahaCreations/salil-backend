const mongoose = require('mongoose');

const phoneOTPSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: auto-delete when expiresAt is reached
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5, // Max 5 attempts before blocking
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup by phone
phoneOTPSchema.index({ phone: 1 });
phoneOTPSchema.index({ phone: 1, verified: 1 });

module.exports = mongoose.model('PhoneOTP', phoneOTPSchema);
