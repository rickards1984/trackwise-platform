import nodemailer from 'nodemailer';
import { generateVerificationUrl } from '../auth/email-verification';

// Configure email transport
let transporter: nodemailer.Transporter;

// In development environment, use a test account
if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
  // Use ethereal.email for testing
  nodemailer.createTestAccount().then(account => {
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
    console.log('Test email account created:', account.user);
    console.log('Email preview URL will be logged when emails are sent');
  });
} else {
  // Use configured email service in production
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

/**
 * Send verification email to user
 * @param to recipient email address
 * @param token verification token
 * @param name recipient's name
 */
export async function sendVerificationEmail(to: string, token: string, name: string): Promise<void> {
  const verificationUrl = generateVerificationUrl(token);
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Apprenticeship Platform" <no-reply@apprenticeshipplatform.com>',
      to,
      subject: 'Please Verify Your Email',
      text: `Hello ${name},\n\nPlease verify your email address by clicking on the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">Apprenticeship Platform</h1>
          </div>
          <div style="margin-bottom: 30px;">
            <p style="font-size: 16px; color: #333;">Hello ${name},</p>
            <p style="font-size: 16px; color: #333;">Thank you for registering with our apprenticeship platform. To complete your registration, please verify your email address by clicking the button below:</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>
          <div style="margin-top: 30px; font-size: 14px; color: #666;">
            <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
            <p style="word-break: break-all;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create an account, please ignore this email.</p>
          </div>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #999;">
            <p>&copy; ${new Date().getFullYear()} Apprenticeship Platform. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
      console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

/**
 * Send password reset email
 * @param to recipient email address
 * @param token reset token
 * @param name recipient's name
 */
export async function sendPasswordResetEmail(to: string, token: string, name: string): Promise<void> {
  const resetUrl = `${process.env.BASE_URL || `http://localhost:5000`}/auth/reset-password?token=${token}`;
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Apprenticeship Platform" <no-reply@apprenticeshipplatform.com>',
      to,
      subject: 'Password Reset Request',
      text: `Hello ${name},\n\nYou requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">Apprenticeship Platform</h1>
          </div>
          <div style="margin-bottom: 30px;">
            <p style="font-size: 16px; color: #333;">Hello ${name},</p>
            <p style="font-size: 16px; color: #333;">We received a request to reset your password. Click the button below to create a new password:</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <div style="margin-top: 30px; font-size: 14px; color: #666;">
            <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request a password reset, please ignore this email and your account will remain secure.</p>
          </div>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #999;">
            <p>&copy; ${new Date().getFullYear()} Apprenticeship Platform. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
      console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}