const mongoose = require('mongoose');

const deviceSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: { type: String, required: true },
    deviceName: { type: String, default: '' },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
    },
    appVersion: { type: String, default: '' },
    fcmToken: { type: String, default: '' },
    refreshToken: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

deviceSessionSchema.index({ userId: 1 });
deviceSessionSchema.index({ refreshToken: 1 });
deviceSessionSchema.index({ deviceId: 1 });

module.exports = mongoose.model('DeviceSession', deviceSessionSchema);
