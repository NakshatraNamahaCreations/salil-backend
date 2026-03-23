const Payment = require('./Payment.model');
const Purchase = require('./Purchase.model');
const User = require('../users/User.model');
const AppError = require('../../common/AppError');

// GET /admin/payments — List all payments with filters
exports.getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, gateway, userId, startDate, endDate } = req.query;

    const query = {};
    if (status) query.status = status;
    if (gateway) query.gateway = gateway;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/payments/:id — Payment detail
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('userId', 'name email phone');
    if (!payment) throw AppError.notFound('Payment not found');
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

// GET /admin/payments/summary — Revenue summary
exports.getPaymentSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage = {};
    if (Object.keys(dateFilter).length > 0) matchStage.createdAt = dateFilter;
    matchStage.status = 'captured';

    const [summaryAgg, statusBreakdown, recentPayments] = await Promise.all([
      Payment.aggregate([
        { $match: matchStage },
        { $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgTransactionValue: { $avg: '$amount' }
        }}
      ]),
      Payment.aggregate([
        { $match: Object.keys(dateFilter).length ? { createdAt: dateFilter } : {} },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }
      ]),
      Payment.find()
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const summary = summaryAgg[0] || { totalRevenue: 0, totalTransactions: 0, avgTransactionValue: 0 };

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: summary.totalRevenue,
        totalTransactions: summary.totalTransactions,
        avgTransactionValue: Math.round(summary.avgTransactionValue || 0),
        statusBreakdown,
        recentPayments
      }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /admin/payments/:id/status — Update payment status (for manual overrides)
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['created', 'authorized', 'captured', 'failed', 'refunded'];
    if (!allowed.includes(status)) throw AppError.badRequest('Invalid status');

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'name email');

    if (!payment) throw AppError.notFound('Payment not found');

    res.status(200).json({ success: true, data: payment, message: 'Payment status updated' });
  } catch (error) {
    next(error);
  }
};

// GET /admin/purchases — List all purchases (coin packs etc.)
exports.getPurchases = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.paymentStatus = status;

    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Purchase.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: purchases,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};
