const Coupon = require('./Coupon.model');
const BookPurchase = require('../payments/BookPurchase.model');
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

// Admin: get all users who used a specific coupon
const getCouponUsages = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).lean();
  if (!coupon) throw AppError.notFound('Coupon not found');

  const usages = await BookPurchase.find({ couponCode: coupon.code, status: 'completed' })
    .populate('userId', 'name email')
    .populate('bookId', 'title')
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    success: true,
    data: {
      code: coupon.code,
      usages: usages.map(u => ({
        user: u.userId?.name || 'Unknown',
        email: u.userId?.email || '',
        book: u.bookId?.title || 'Unknown',
        amountPaid: u.amountPaid,
        originalAmount: u.originalAmount || u.amountPaid,
        discountAmount: u.discountAmount || 0,
        date: u.createdAt,
      })),
    },
  });
});

// Reader-facing: validate a coupon before purchase (does NOT consume it)
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, purchaseType = 'ebook', amount } = req.body;
  if (!code || !amount) throw AppError.badRequest('code and amount are required');

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!coupon || !coupon.isActive) throw AppError.badRequest('Invalid or inactive coupon code');

  const now = new Date();
  if (coupon.validFrom && now < new Date(coupon.validFrom)) throw AppError.badRequest('Coupon is not valid yet');
  if (coupon.validUntil && now > new Date(coupon.validUntil)) throw AppError.badRequest('Coupon has expired');
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw AppError.badRequest('Coupon usage limit reached');
  if (coupon.minPurchaseAmount > 0 && amount < coupon.minPurchaseAmount)
    throw AppError.badRequest(`Minimum purchase amount is ₹${coupon.minPurchaseAmount}`);
  if (coupon.applicableTo !== 'all' && coupon.applicableTo !== purchaseType)
    throw AppError.badRequest(`This coupon is only valid for ${coupon.applicableTo}`);

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (amount * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount > 0) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
  } else {
    discountAmount = coupon.discountValue;
  }
  discountAmount = Math.min(Math.round(discountAmount * 100) / 100, amount);
  const finalAmount = Math.round((amount - discountAmount) * 100) / 100;

  return res.json({
    success: true,
    data: {
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalAmount,
    },
  });
});

module.exports = { getCoupons, createCoupon, updateCoupon, toggleCoupon, deleteCoupon, validateCoupon, getCouponUsages };
