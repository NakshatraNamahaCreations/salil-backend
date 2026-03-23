const mongoose = require('mongoose');

const emailOTPSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['forgot_password'],
      default: 'forgot_password',
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

emailOTPSchema.index({ email: 1, purpose: 1 });
emailOTPSchema.index({ email: 1, purpose: 1, verified: 1 });

module.exports = mongoose.model('EmailOTP', emailOTPSchema);
