import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 3000;
const envMode = process.env.ENV_MODE || 'development';
const mongoUrl =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/default_db';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeSuccessUrl =
  process.env.STRIPE_SUCCESS_URL ||
  `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
const stripeCancelUrl =
  process.env.STRIPE_CANCEL_URL || `${frontendUrl}/billing/cancel`;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const bcryptSaltRounds = process.env.BCRYPT_SALT_ROUNDS || '10';
const jwtSecretKey = process.env.JWT_SECRET_KEY || 'default_secret_key';
const mailEmail = process.env.MAIL_EMAIL || 'hGpGj@example.com';
const mailPassword = process.env.MAIL_PASSWORD || 'pX8z8A3C2r';
const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '1d';
const accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@localhost';
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '';
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || '';
const watermarkPublicId = process.env.WATERMARK_PUBLIC_ID || '';

export {
  port,
  envMode,
  mongoUrl,
  frontendUrl,
  stripeSecretKey,
  stripeSuccessUrl,
  stripeCancelUrl,
  stripeWebhookSecret,
  bcryptSaltRounds,
  jwtSecretKey,
  mailEmail,
  mailPassword,
  refreshTokenExpiresIn,
  accessTokenExpiresIn,
  superAdminEmail,
  superAdminPassword,
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret,
  watermarkPublicId,
};
