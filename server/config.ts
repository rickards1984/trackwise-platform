// Configuration settings for the application

export const config = {
  // Base URL for the application
  BASE_URL: process.env.BASE_URL || 'http://localhost:5000',
  
  // Email configuration
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@apprenticeshipplatform.com',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  
  // Session configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'development-session-secret',
  
  // Security
  PASSWORD_SALT_ROUNDS: 10,
  
  // Other application settings
  DEFAULT_PAGE_SIZE: 10,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
};