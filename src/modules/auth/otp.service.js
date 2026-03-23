const PhoneOTP = require('./PhoneOTP.model');
const AppError = require('../../common/AppError');

/**
 * Generate a 6-digit OTP code
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Request OTP for a phone number
 * Checks rate limiting and sends OTP
 */
const requestOTP = async (phone) => {
  // Validate phone format
  if (!phone || phone.trim().length < 10) {
    throw AppError.badRequest('Invalid phone number');
  }

  const normalizedPhone = phone.trim().toLowerCase();

  // Check if phone is blocked due to too many attempts
  const existingOTP = await PhoneOTP.findOne({ phone: normalizedPhone });
  if (existingOTP?.blockedUntil && new Date() < existingOTP.blockedUntil) {
    const minutesLeft = Math.ceil((existingOTP.blockedUntil - new Date()) / 60000);
    throw AppError.tooManyRequests(
      `Too many attempts. Please try again in ${minutesLeft} minutes.`
    );
  }

  // Check for recent OTP request (rate limiting - max 3 per 10 minutes)
  const recentOTPs = await PhoneOTP.countDocuments({
    phone: normalizedPhone,
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  });

  if (recentOTPs >= 3) {
    // Block for 10 minutes
    await PhoneOTP.findOneAndUpdate(
      { phone: normalizedPhone },
      { blockedUntil: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true }
    );
    throw AppError.tooManyRequests(
      'Too many OTP requests. Please try again in 10 minutes.'
    );
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

  // Save OTP to database
  await PhoneOTP.create({
    phone: normalizedPhone,
    otp,
    verified: false,
    expiresAt,
    attempts: 0,
  });

  // TODO: Send OTP via SMS (Twilio, AWS SNS, etc.)
  // For MVP, log to console
  console.log(`\n📱 [OTP] Phone: ${normalizedPhone} | OTP: ${otp} | Expires at: ${expiresAt}\n`);

  return {
    message: 'OTP sent to your phone',
    phone: normalizedPhone,
    // In production, don't expose OTP. This is for testing only.
    otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    expiresIn: 300, // 5 minutes in seconds
  };
};

/**
 * Verify OTP and return verified status
 */
const verifyOTP = async (phone, otp) => {
  if (!phone || !otp) {
    throw AppError.badRequest('Phone and OTP are required');
  }

  const normalizedPhone = phone.trim().toLowerCase();

  // Find the OTP record
  const phoneOTPRecord = await PhoneOTP.findOne({
    phone: normalizedPhone,
    verified: false,
  });

  if (!phoneOTPRecord) {
    throw AppError.unauthorized('OTP not found or already verified. Request a new OTP.');
  }

  // Check if OTP is expired
  if (new Date() > phoneOTPRecord.expiresAt) {
    await PhoneOTP.findByIdAndDelete(phoneOTPRecord._id);
    throw AppError.unauthorized('OTP has expired. Please request a new OTP.');
  }

  // Check if max attempts reached
  if (phoneOTPRecord.attempts >= 5) {
    throw AppError.forbidden('Maximum OTP verification attempts exceeded. Request a new OTP.');
  }

  // Verify OTP
  if (phoneOTPRecord.otp !== otp.trim()) {
    // Increment attempts
    await PhoneOTP.findByIdAndUpdate(phoneOTPRecord._id, {
      attempts: phoneOTPRecord.attempts + 1,
    });
    throw AppError.unauthorized('Invalid OTP. Please try again.');
  }

  // Mark as verified
  await PhoneOTP.findByIdAndUpdate(phoneOTPRecord._id, { verified: true });

  return {
    verified: true,
    phone: normalizedPhone,
    message: 'OTP verified successfully',
  };
};

/**
 * Check if phone is verified
 */
const isPhoneVerified = async (phone) => {
  const normalizedPhone = phone.trim().toLowerCase();
  const verification = await PhoneOTP.findOne({
    phone: normalizedPhone,
    verified: true,
  });
  return !!verification;
};

/**
 * Clean up expired OTPs (optional - MongoDB TTL index handles this)
 */
const cleanupExpiredOTPs = async () => {
  const result = await PhoneOTP.deleteMany({
    expiresAt: { $lt: new Date() },
  });
  console.log(`Cleaned up ${result.deletedCount} expired OTP records`);
  return result;
};

module.exports = {
  generateOTP,
  requestOTP,
  verifyOTP,
  isPhoneVerified,
  cleanupExpiredOTPs,
};
