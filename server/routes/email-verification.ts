import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { generateToken } from '../auth/email-verification';
import { sendVerificationEmail } from '../services/email';

const router = express.Router();

// Verification token schema
const tokenSchema = z.object({
  token: z.string().min(1)
});

// Resend verification schema
const resendSchema = z.object({
  email: z.string().email()
});

// Verify email with token
router.get('/verify', async (req, res) => {
  try {
    const { token } = tokenSchema.parse(req.query);
    
    // Find verification record by token
    const verification = await storage.getEmailVerificationByToken(token);
    if (!verification) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token',
        success: false
      });
    }
    
    // Check if token is expired
    const currentTime = new Date();
    if (currentTime > verification.expiresAt) {
      return res.status(400).json({ 
        message: 'Verification token has expired',
        success: false
      });
    }
    
    // Check if already verified
    if (verification.verified) {
      return res.status(200).json({ 
        message: 'Email already verified',
        success: true
      });
    }
    
    // Update verification record
    await storage.updateEmailVerification(verification.id, {
      verified: true,
      verifiedAt: currentTime
    });
    
    // Update user status
    await storage.updateUserStatus(verification.userId, 'active');
    
    // Redirect to success page
    res.redirect('/auth/verify-email?success=true');
  } catch (error) {
    console.error('Email verification error:', error);
    res.redirect('/auth/verify-email?success=false');
  }
});

// Resend verification email
router.post('/resend', async (req, res) => {
  try {
    const { email } = resendSchema.parse(req.body);
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // For security, still return success even if no user found
      return res.status(200).json({ 
        message: 'If your email is registered, a new verification link has been sent',
        success: true
      });
    }
    
    // Check if user is already verified
    if (user.status !== 'unverified') {
      return res.status(200).json({ 
        message: 'Your account is already verified',
        success: true
      });
    }
    
    // Find existing verification record
    const verification = await storage.getEmailVerificationByUserId(user.id);
    
    // Generate a new token and expiration date
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration
    
    if (verification) {
      // Update existing verification record
      await storage.updateEmailVerification(verification.id, {
        token,
        expiresAt,
        verified: false
      });
    } else {
      // Create new verification record
      await storage.createEmailVerification({
        userId: user.id,
        email: user.email,
        token,
        expiresAt,
        verified: false
      });
    }
    
    // Send verification email
    await sendVerificationEmail(user.email, token, user.firstName);
    
    res.status(200).json({ 
      message: 'A new verification link has been sent to your email',
      success: true
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      message: 'Failed to resend verification email',
      success: false
    });
  }
});

export default router;