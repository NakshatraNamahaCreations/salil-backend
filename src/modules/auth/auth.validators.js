const Joi = require('joi');

const registerSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    phone: Joi.string().allow('').optional(),
    referralCode: Joi.string().alphanum().length(8).uppercase().allow('').optional(),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().optional(),
    identifier: Joi.string().optional(),
    password: Joi.string().required(),
  }).or('email', 'identifier'),
};

const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
  }),
};

const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).max(128).required(),
  }),
};

const verifyForgotPasswordOTPSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyForgotPasswordOTPSchema,
};
