const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validate = require('../../common/validate');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyForgotPasswordOTPSchema,
} = require('./auth.validators');
const { authenticate } = require('../../common/auth.middleware');

// Public routes - Email/Password
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/admin/login', validate(loginSchema), authController.adminLogin);
router.post('/author/login', validate(loginSchema), authController.authorLogin);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/forgot-password-otp', validate(forgotPasswordSchema), authController.forgotPasswordOTP);
router.post('/verify-forgot-password-otp', validate(verifyForgotPasswordOTPSchema), authController.verifyForgotPasswordOTP);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Public routes - Phone/OTP (canonical)
router.post('/phone/request-otp', authController.requestOTP);
router.post('/phone/verify-otp', authController.verifyOTP);

// Mobile-friendly aliases
router.post('/send-otp', authController.mobileSendOTP);
router.post('/resend-otp', authController.mobileSendOTP);
router.post('/verify-otp', authController.mobileVerifyOTP);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
