const Review = require('./Review.model');
const AppError = require('../../common/AppError');
const logger = require('../../common/logger');

exports.getReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    let query = {};
    if (status) query.status = status;

    const reviews = await Review.find(query)
      .populate('userId', 'name email')
      .populate('contentId', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    const formatted = reviews.map(r => ({
      _id: r._id,
      user: r.userId?.name || r.userId?.email || 'Unknown',
      contentType: r.contentType,
      contentTitle: r.contentId?.title || '',
      rating: r.rating,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.approveReview = async (req, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!review) throw AppError.notFound('Review not found');
    logger.info(`Admin ${req.user.userId} approved review ${req.params.id}`);
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) throw AppError.notFound('Review not found');
    logger.info(`Admin ${req.user.userId} deleted review ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};
