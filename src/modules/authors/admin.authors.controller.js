const Author = require('./Author.model');
const User = require('../users/User.model');
const AppError = require('../../common/AppError');
const logger = require('../../common/logger');

exports.getAuthors = async (req, res, next) => {
  try {
    const { page = 1, limit = 15, search, status } = req.query;

    let query = {};
    if (search) {
      query.$or = [{ displayName: { $regex: search, $options: 'i' } }];
    }
    if (status === 'approved') query.isApproved = true;
    if (status === 'pending') query.isApproved = false;

    const [authors, total] = await Promise.all([
      Author.find(query)
        .populate('userId', 'email name isBlocked')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Author.countDocuments(query),
    ]);

    const data = authors.map((a) => ({
      _id: a._id,
      displayName: a.displayName,
      bio: a.bio,
      avatar: a.avatar,
      email: a.userId?.email || 'N/A',
      name: a.userId?.name || '',
      isBlocked: a.userId?.isBlocked || false,
      userId: a.userId?._id,
      isApproved: a.isApproved,
      totalEarnings: a.totalEarnings,
      socialLinks: a.socialLinks,
      contentPermissions: a.contentPermissions,
      createdAt: a.createdAt,
    }));

    res.status(200).json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuthor = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id).populate('userId', 'email name isBlocked isVerified');
    if (!author) throw AppError.notFound('Author not found');
    res.status(200).json({ success: true, data: author });
  } catch (error) {
    next(error);
  }
};

exports.createAuthor = async (req, res, next) => {
  try {
    const { displayName, email, password, bio, socialLinks, contentPermissions } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw AppError.conflict('Email already registered');

    const user = await User.create({
      name: displayName,
      email: email.toLowerCase(),
      passwordHash: password,
      role: 'author',
      isVerified: true,
    });

    const author = await Author.create({
      userId: user._id,
      displayName,
      bio: bio || '',
      socialLinks: socialLinks || {},
      contentPermissions: contentPermissions || {},
      isApproved: true,
      approvedBy: req.user.userId,
    });

    logger.info(`Admin ${req.user.userId} created author ${author._id}`);
    res.status(201).json({ success: true, data: author });
  } catch (error) {
    next(error);
  }
};

exports.updateAuthor = async (req, res, next) => {
  try {
    const { displayName, bio, avatar, socialLinks, contentPermissions } = req.body;

    const author = await Author.findById(req.params.id);
    if (!author) throw AppError.notFound('Author not found');

    if (displayName) author.displayName = displayName;
    if (bio !== undefined) author.bio = bio;
    if (avatar !== undefined) author.avatar = avatar;
    if (socialLinks) author.socialLinks = { ...author.socialLinks, ...socialLinks };
    if (contentPermissions) author.contentPermissions = { ...author.contentPermissions, ...contentPermissions };

    await author.save();

    // Sync name on User record
    if (displayName) {
      await User.findByIdAndUpdate(author.userId, { name: displayName });
    }

    logger.info(`Admin ${req.user.userId} updated author ${author._id}`);
    res.status(200).json({ success: true, data: author });
  } catch (error) {
    next(error);
  }
};

exports.deleteAuthor = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) throw AppError.notFound('Author not found');

    await User.findByIdAndDelete(author.userId);
    await Author.findByIdAndDelete(req.params.id);

    logger.info(`Admin ${req.user.userId} deleted author ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Author deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.approveAuthor = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) throw AppError.notFound('Author not found');

    author.isApproved = true;
    author.approvedBy = req.user.userId;
    await author.save();

    logger.info(`Admin ${req.user.userId} approved author ${author._id}`);
    res.status(200).json({ success: true, message: 'Author approved successfully', data: author });
  } catch (error) {
    next(error);
  }
};

exports.revokeAuthor = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) throw AppError.notFound('Author not found');

    author.isApproved = false;
    await author.save();

    logger.info(`Admin ${req.user.userId} revoked author ${author._id}`);
    res.status(200).json({ success: true, message: 'Author approval revoked', data: author });
  } catch (error) {
    next(error);
  }
};
