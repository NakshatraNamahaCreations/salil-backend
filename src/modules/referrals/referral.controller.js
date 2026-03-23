const Referral = require('./Referral.model');
const ReferralSettings = require('./ReferralSettings.model');
const AppError = require('../../common/AppError');
const { asyncHandler } = require('../../common/errorHandler');

const getReferrals = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;

  const total = await Referral.countDocuments(query);
  const skip = (Number(page) - 1) * Number(limit);

  const [referrals, settings] = await Promise.all([
    Referral.find(query)
      .populate('referrerId', 'name email phone')
      .populate('refereeId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ReferralSettings.findOne().lean(),
  ]);

  const [totalCount, successCount, pendingCount] = await Promise.all([
    Referral.countDocuments(),
    Referral.countDocuments({ status: 'completed' }),
    Referral.countDocuments({ status: 'pending' }),
  ]);

  return res.json({
    success: true,
    data: {
      referrals,
      settings: settings || {},
      stats: { total: totalCount, successful: successCount, pending: pendingCount },
    },
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

const updateReferralStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const referral = await Referral.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  ).populate('referrerId', 'name email').populate('refereeId', 'name email');

  if (!referral) throw AppError.notFound('Referral not found');

  return res.json({ success: true, data: referral, message: 'Referral updated' });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { rewardType, referrerReward, refereeReward, maxReferrals, isActive } = req.body;

  const settings = await ReferralSettings.findOneAndUpdate(
    {},
    {
      ...(rewardType !== undefined && { rewardType }),
      ...(referrerReward !== undefined && { referrerReward: Number(referrerReward) }),
      ...(refereeReward !== undefined && { refereeReward: Number(refereeReward) }),
      ...(maxReferrals !== undefined && { maxReferrals: Number(maxReferrals) }),
      ...(isActive !== undefined && { isActive }),
    },
    { new: true, upsert: true, runValidators: true }
  );

  return res.json({ success: true, data: settings, message: 'Settings updated' });
});

module.exports = { getReferrals, updateReferralStatus, updateSettings };
