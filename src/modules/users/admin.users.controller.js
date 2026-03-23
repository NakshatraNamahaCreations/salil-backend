const User = require('./User.model');
const AppError = require('../../common/AppError');
const logger = require('../../common/logger');
const bcrypt = require('bcryptjs');

// GET /admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 15, search, role } = req.query;
    
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdmins = async (req, res, next) => {
  try {
    const { page = 1, limit = 15, search = "" } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 15;

    const query = {
      role: { $in: ["admin", "superadmin"] },
    };

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/users/:id
exports.getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) throw AppError.notFound('User not found');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// POST /admin/users — Create a user (admin or reader)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role = 'reader' } = req.body;
    if (!name || !email || !password) throw AppError.badRequest('name, email and password are required');

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw AppError.conflict('A user with this email already exists');

    const allowedRoles = ['reader', 'admin', 'superadmin'];
    if (!allowedRoles.includes(role)) throw AppError.badRequest('Invalid role');

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // hashed by pre-save hook
      phone: phone || undefined,
      role,
      isVerified: true,
    });

    const safe = user.toObject();
    delete safe.passwordHash;

    logger.info(`Admin ${req.user?._id} created user ${user._id} (${role})`);
    res.status(201).json({ success: true, data: safe, message: 'User created successfully' });
  } catch (error) {
    next(error);
  }
};

// PUT /admin/users/:id — Update user profile
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, isBlocked, isVerified, password } = req.body;
    const user = await User.findById(req.params.id).select('+passwordHash');
    if (!user) throw AppError.notFound('User not found');

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (phone !== undefined) user.phone = phone;
    if (role && ['reader', 'admin', 'superadmin'].includes(role)) user.role = role;
    if (isBlocked !== undefined) user.isBlocked = isBlocked;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (password) user.passwordHash = password; // hashed by pre-save hook

    await user.save();

    const safe = user.toObject();
    delete safe.passwordHash;

    logger.info(`Admin ${req.user?._id} updated user ${user._id}`);
    res.status(200).json({ success: true, data: safe, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

// DELETE /admin/users/:id — Soft delete (block) or hard delete
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw AppError.notFound('User not found');
    if (user.role === 'superadmin') throw AppError.forbidden('Cannot delete superadmin');

    await User.findByIdAndDelete(req.params.id);

    logger.info(`Admin ${req.user?._id} deleted user ${req.params.id}`);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PATCH /admin/users/:id/block
exports.toggleBlockStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw AppError.notFound('User not found');
    if (user.role === 'superadmin') throw AppError.forbidden('Cannot block superadmin');
    
    user.isBlocked = !user.isBlocked;
    await user.save();
    
    logger.info(`Admin ${req.user._id} ${user.isBlocked ? 'blocked' : 'unblocked'} user ${user._id}`);
    
    res.status(200).json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, data: user });
  } catch (error) {
    next(error);
  }
};
