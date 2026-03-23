const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Create a reusable transporter.
 * Supports Gmail, Outlook/Office365, or any generic SMTP.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure, // true for 465, false for 587/25
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
};

/**
 * Send a forgot-password OTP email.
 * @param {string} to      - recipient email
 * @param {string} otp     - 6-digit OTP
 * @param {number} expiryMinutes - how long the OTP is valid
 */
const sendForgotPasswordOTP = async (to, otp, expiryMinutes = 10) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
    to,
    subject: 'Your Password Reset OTP',
    text: `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for ${expiryMinutes} minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background:#4F46E5;padding:32px 24px;">
              <p style="margin:0;font-size:32px;">📚</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Password Reset OTP</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                Hi there,<br/>
                We received a request to reset your password. Use the OTP below to continue.
              </p>

              <!-- OTP Box -->
              <div style="text-align:center;margin:24px 0;">
                <div style="display:inline-block;background:#F0EFFE;border:2px dashed #4F46E5;border-radius:12px;padding:18px 40px;">
                  <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:12px;color:#4F46E5;">${otp}</p>
                </div>
              </div>

              <p style="margin:0 0 8px;color:#6B7280;font-size:13px;text-align:center;">
                This OTP is valid for <strong>${expiryMinutes} minutes</strong>.
              </p>
              <p style="margin:0 0 24px;color:#6B7280;font-size:13px;text-align:center;">
                Do not share this OTP with anyone.
              </p>

              <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 24px;"/>

              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                If you did not request a password reset, you can safely ignore this email.<br/>
                Your password will not be changed.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#F9FAFB;padding:16px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">&copy; ${new Date().getFullYear()} ${config.email.fromName}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 [Email] OTP sent to ${to} | MessageId: ${info.messageId}`);
  return info;
};

module.exports = { sendForgotPasswordOTP };
