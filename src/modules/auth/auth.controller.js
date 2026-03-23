const authService = require('./auth.service');
const { asyncHandler } = require('../../common/errorHandler');
const { success, created } = require('../../common/response');

/**
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  created(res, result, 'Registration successful');
});

/**
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    identifier: req.body.identifier || req.body.email,
    password: req.body.password,
    expectedRole: null,
  });
  success(res, result, 'Login successful');
});

/**
 * POST /api/v1/auth/admin/login
 */
const adminLogin = asyncHandler(async (req, res) => {
  const result = await authService.login({
    ...req.body,
    expectedRole: 'admin',
  });
  success(res, result, 'Admin login successful');
});

/**
 * POST /api/v1/auth/author/login
 */
const authorLogin = asyncHandler(async (req, res) => {
  const result = await authService.login({
    ...req.body,
    expectedRole: 'author',
  });
  success(res, result, 'Author login successful');
});

/**
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);
  success(res, tokens, 'Token refreshed');
});

/**
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  // TODO: Revoke refresh token in Redis/DB
  success(res, null, 'Logged out successfully');
});

/**
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  success(res, result);
});

/**
 * POST /api/v1/auth/forgot-password-otp
 * Mobile-friendly: sends a 6-digit OTP to the user's email
 */
const forgotPasswordOTP = asyncHandler(async (req, res) => {
  const result = await authService.forgotPasswordOTP(req.body.email);
  success(res, result, 'OTP sent to your email');
});

/**
 * POST /api/v1/auth/verify-forgot-password-otp
 * Verifies the OTP and returns a short-lived reset token
 */
const verifyForgotPasswordOTP = asyncHandler(async (req, res) => {
  const result = await authService.verifyForgotPasswordOTP(req.body.email, req.body.otp);
  success(res, result, 'OTP verified');
});

/**
 * POST /api/v1/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body.token, req.body.password);
  success(res, result);
});

/**
 * POST /api/v1/auth/phone/request-otp
 */
const requestOTP = asyncHandler(async (req, res) => {
  const result = await authService.requestOTP(req.body.phone);
  success(res, result, 'OTP sent successfully');
});

/**
 * POST /api/v1/auth/phone/verify-otp
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const result = await authService.verifyOTP(req.body.phone, req.body.otp);
  success(res, result, 'OTP verified successfully');
});

/**
 * POST /api/v1/auth/send-otp  (mobile-friendly alias)
 * POST /api/v1/auth/resend-otp (mobile-friendly alias)
 * Accepts { mobile_number, country_code }
 */
const mobileSendOTP = asyncHandler(async (req, res) => {
  const { mobile_number, country_code = '+91' } = req.body;
  if (!mobile_number) {
    throw require('../../common/AppError').badRequest('mobile_number is required');
  }
  const phone = `${country_code}${mobile_number}`.replace(/\s/g, '');
  const result = await authService.requestOTP(phone);
  success(res, result, 'OTP sent successfully');
});

/**
 * POST /api/v1/auth/verify-otp  (mobile-friendly alias)
 * Accepts { mobile_number, otp, country_code }
 */
const mobileVerifyOTP = asyncHandler(async (req, res) => {
  const { mobile_number, otp, country_code = '+91' } = req.body;
  if (!mobile_number || !otp) {
    throw require('../../common/AppError').badRequest('mobile_number and otp are required');
  }
  const phone = `${country_code}${mobile_number}`.replace(/\s/g, '');
  const result = await authService.verifyOTP(phone, otp);
  success(res, result, 'OTP verified successfully');
});

/**
 * POST /api/v1/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw require('../../common/AppError').badRequest('currentPassword and newPassword are required');
  }
  const result = await authService.changePassword(req.user._id, currentPassword, newPassword);
  success(res, result, 'Password changed successfully');
});

module.exports = {
  register,
  login,
  adminLogin,
  authorLogin,
  refreshToken,
  logout,
  forgotPassword,
  forgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetPassword,
  requestOTP,
  verifyOTP,
  mobileSendOTP,
  mobileVerifyOTP,
  changePassword,
};
