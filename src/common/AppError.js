class AppError extends Error {
  constructor(message, statusCode, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', code) {
    return new AppError(message, 400, code || 'BAD_REQUEST');
  }

  static unauthorized(message = 'Unauthorized', code) {
    return new AppError(message, 401, code || 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden', code) {
    return new AppError(message, 403, code || 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found', code) {
    return new AppError(message, 404, code || 'NOT_FOUND');
  }

  static conflict(message = 'Conflict', code) {
    return new AppError(message, 409, code || 'CONFLICT');
  }

  static tooMany(message = 'Too many requests', code) {
    return new AppError(message, 429, code || 'TOO_MANY_REQUESTS');
  }

  static internal(message = 'Internal server error', code) {
    return new AppError(message, 500, code || 'INTERNAL_ERROR');
  }
}

module.exports = AppError;
