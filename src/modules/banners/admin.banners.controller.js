const Banner = require('./Banner.model');
const AppError = require('../../common/AppError');
const logger = require('../../common/logger');

exports.getBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ priority: -1, createdAt: -1 });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
};

exports.createBanner = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.file?.location) {
      data.imageUrl = req.file.location;
    }
    const banner = new Banner(data);
    await banner.save();
    logger.info(`Admin ${req.user.userId} created banner ${banner._id}`);
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

exports.updateBanner = async (req, res, next) => {
  try {
    const data = {};
    // Allow title to be cleared (empty string). Skip empty strings only for non-title fields.
    const ALLOW_EMPTY = new Set(['title']);
    for (const [key, val] of Object.entries(req.body)) {
      if (val !== undefined && (val !== '' || ALLOW_EMPTY.has(key))) data[key] = val;
    }
    if (req.file?.location) {
      data.imageUrl = req.file.location;
    }
    logger.info(`Update banner ${req.params.id} — fields: ${Object.keys(data).join(', ')} — file: ${req.file?.location || 'none'}`);
    const banner = await Banner.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!banner) throw AppError.notFound('Banner not found');
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) throw AppError.notFound('Banner not found');
    banner.isActive = !banner.isActive;
    await banner.save();
    logger.info(`Admin ${req.user.userId} toggled banner ${req.params.id} to ${banner.isActive}`);
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

exports.deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) throw AppError.notFound('Banner not found');
    logger.info(`Admin ${req.user.userId} deleted banner ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    next(error);
  }
};
