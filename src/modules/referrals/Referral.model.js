const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    refereeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referralCode: { type: String, required: true, uppercase: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired'],
      default: 'pending',
    },
    rewardGiven: { type: Boolean, default: false },
    rewardAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

referralSchema.index({ referrerId: 1 });
referralSchema.index({ refereeId: 1 });
referralSchema.index({ referralCode: 1 });

module.exports = mongoose.model('Referral', referralSchema);
