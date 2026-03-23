const Coupon = require('./Coupon.model');
const AppError = require('../../common/AppError');
const { asyncHandler } = require('../../common/errorHandler');
const { success, created } = require('../../common/response');

const getCoupons = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (search) {
    const re = new RegExp(search, 'i');
    query.$or = [{ code: re }, { description: re }];
  }

  const total = await Coupon.countDocuments(query);
  const skip = (Number(page) - 1) * Number(limit);
  const coupons = await Coupon.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  return res.json({
    success: true,
    data: coupons,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

const createCoupon = asyncHandler(async (req, res) => {
  const {
    code, description, discountType, discountValue,
    minPurchaseAmount, maxDiscountAmount, usageLimit,
    validFrom, validUntil, applicableTo,
  } = req.body;

  if (!code || !discountValue) throw AppError.badRequest('code and discountValue are required');

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    description: description || '',
    discountType: discountType || 'percentage',
    discountValue: Number(discountValue),
    minPurchaseAmount: Number(minPurchaseAmount) || 0,
    maxDiscountAmount: Number(maxDiscountAmount) || 0,
    usageLimit: Number(usageLimit) || 0,
    validFrom: validFrom || null,
    validUntil: validUntil || null,
    applicableTo: applicableTo || 'all',
  });

  created(res, coupon, 'Coupon created successfully');
});

const updateCoupon = asyncHandler(async (req, res) => {
  const {
    code, description, discountType, discountValue,
    minPurchaseAmount, maxDiscountAmount, usageLimit,
    validFrom, validUntil, applicableTo, isActive,
  } = req.body;

  const update = {};
  if (code !== undefined) update.code = code.toUpperCase().trim();
  if (description !== undefined) update.description = description;
  if (discountType !== undefined) update.discountType = discountType;
  if (discountValue !== undefined) update.discountValue = Number(discountValue);
  if (minPurchaseAmount !== undefined) update.minPurchaseAmount = Number(minPurchaseAmount);
  if (maxDiscountAmount !== undefined) update.maxDiscountAmount = Number(maxDiscountAmount);
  if (usageLimit !== undefined) update.usageLimit = Number(usageLimit);
  if (validFrom !== undefined) update.validFrom = validFrom || null;
  if (validUntil !== undefined) update.validUntil = validUntil || null;
  if (applicableTo !== undefined) update.applicableTo = applicableTo;
  if (isActive !== undefined) update.isActive = isActive === true || isActive === 'true';

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!coupon) throw AppError.notFound('Coupon not found');

  success(res, coupon, 'Coupon updated successfully');
});

const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw AppError.notFound('Coupon not found');
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  success(res, coupon, `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}`);
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw AppError.notFound('Coupon not found');
  success(res, null, 'Coupon deleted');
});

module.exports = { getCoupons, createCoupon, updateCoupon, toggleCoupon, deleteCoupon };
