import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { config as appConfig } from '../config';

// Create a test account for development environment
const createTestAccount = async () => {
  try {
    return await nodemailer.createTestAccount();
  } catch (error) {
    console.error('Error creating test email account:', error);
    return {
      user: 'test@example.com',
      pass: 'password123'
    };
  }
};

// Generate a verification token
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  token: string
): Promise<boolean> => {
  try {
    // Get test account for development
    const testAccount = await createTestAccount();
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    // Add the user's first name to the email for personalization
    const verificationLink = `${appConfig.BASE_URL}/auth/verify-email?token=${token}`;
    const userFirstName = firstName || 'User';
    
    // Send mail
    const info = await transporter.sendMail({
      from: '"Apprenticeship Platform" <no-reply@apprenticeshipplatform.com>',
      to: email,
      subject: 'Email Verification',
      text: `Please verify your email by clicking on the following link: ${verificationLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p>Thank you for registering with our Apprenticeship Platform. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #888; font-size: 12px;">If you didn't request this verification, please ignore this email.</p>
        </div>
      `,
    });
    
    console.log('Email verification sent:', info.messageId);
    
    // For development, log the URL where the email can be previewed
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};