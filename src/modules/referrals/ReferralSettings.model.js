const mongoose = require('mongoose');

// Singleton settings document
const referralSettingsSchema = new mongoose.Schema(
  {
    rewardType: { type: String, enum: ['discount', 'cashback'], default: 'discount' },
    referrerReward: { type: Number, default: 10 },
    refereeReward: { type: Number, default: 5 },
    maxReferrals: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReferralSettings', referralSettingsSchema);
