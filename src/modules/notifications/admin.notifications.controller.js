const Notification = require('./Notification.model');
const AppError = require('../../common/AppError');
const logger = require('../../common/logger');

exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Notification.countDocuments();
    res.status(200).json({
      success: true,
      data: notifications,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.sendNotification = async (req, res, next) => {
  try {
    const { title, body, type, targetType } = req.body;
    if (!title || !body) throw AppError.badRequest('Title and body are required');
    const notification = new Notification({
      title,
      body,
      type: type || 'custom',
      targetType: targetType || 'all',
      status: 'sent',
      sentAt: new Date(),
      createdBy: req.user.userId,
    });
    await notification.save();
    logger.info(`Admin ${req.user.userId} sent notification ${notification._id}`);
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) throw AppError.notFound('Notification not found');
    logger.info(`Admin ${req.user.userId} deleted notification ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};
