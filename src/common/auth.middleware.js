const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('./AppError');
const User = require('../modules/users/User.model');

/**
 * Authenticate JWT access token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    if (user.isBlocked) {
      throw AppError.forbidden('Your account has been blocked');
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(error);
    }
    next(error);
  }
};

/**
 * Authorize by role(s)
 * @param  {...string} roles - allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
};

/**
 * Authenticate reader (OTP-based, role must be 'reader')
 */
const authenticateReader = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      // Accept token via query param (for iframe/WebView PDF streaming)
      token = req.query.token;
    }

    if (!token) {
      throw AppError.unauthorized('Access token required');
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret);

    if (decoded.role !== 'reader') {
      throw AppError.forbidden('Reader access only');
    }


    const user = await User.findById(decoded.userId).select('-passwordHash');


    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    if (user.isBlocked) {
      throw AppError.forbidden('Your account has been blocked');
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (user && !user.isBlocked) {
        req.user = user;
        req.userId = user._id;
      }
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
  }
  next();
};

module.exports = { authenticate, authenticateReader, authorize, optionalAuth };
