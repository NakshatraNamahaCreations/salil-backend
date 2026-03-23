const User = require('../users/User.model');
const Author = require('../authors/Author.model');
const Book = require('../books/Book.model');
const CoinPack = require('../wallet/CoinPack.model');
const logger = require('../../common/logger');

// Safely require models that may not exist yet
let Payment, WalletTransaction;
try { Payment = require('../payments/Payment.model'); } catch (_) {}
try { WalletTransaction = require('../wallet/WalletTransaction.model'); } catch (_) {}

exports.getAnalytics = async (req, res, next) => {
  try {
    // Books by language
    const booksByLanguage = await Book.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$bookLanguage', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, language: { $ifNull: ['$_id', 'Unknown'] }, count: 1 } },
    ]);

    // Recent payments (last 10)
    let recentPayments = [];
    let totalRevenue = 0;
    let totalBookPurchases = 0;
    if (Payment) {
      const rawPayments = await Payment.find({ status: 'captured' })
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Normalize: divide paise→rupees, flatten user fields
      recentPayments = rawPayments.map((p) => {
        const user = p.userId || {};
        const userName = user.name && user.name !== 'Reader' ? user.name : null;
        const userPhone = user.phone || null;
        const userEmail = user.email && !user.email.includes('@saliljaveri.local') ? user.email : null;
        return {
          ...p,
          amount: Math.round((p.amount || 0) / 100),
          userName: userName || userPhone || userEmail || 'N/A',
          userPhone: userPhone || 'N/A',
          bookTitle: p.metadata?.bookTitle || p.metadata?.book_title || 'Book purchase',
        };
      });

      const revResult = await Payment.aggregate([
        { $match: { status: 'captured' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      // Convert paise to rupees
      totalRevenue = Math.round((revResult[0]?.total || 0) / 100);
      totalBookPurchases = await Payment.countDocuments({ status: 'captured' });
    }

    res.status(200).json({
      success: true,
      data: {
        booksByLanguage,
        recentPayments,
        totalRevenue,
        totalBookPurchases,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalAuthors, totalBooks, pendingAuthors] = await Promise.all([
      User.countDocuments(),
      Author.countDocuments({ isApproved: true }),
      Book.countDocuments({ status: 'published' }),
      Author.countDocuments({ isApproved: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalAuthors,
        totalBooks,
        pendingAuthors,
      },
    });
  } catch (error) {
    next(error);
  }
};
