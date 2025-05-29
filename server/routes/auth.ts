import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { emailVerificationSchema, insertUserSchema, userSchema } from '@shared/validation/user';
import { storage } from '../storage';
import { authRateLimiter } from '../middleware/rateLimiter';
import { generateVerificationToken, sendVerificationEmail } from '../services/email';
import { db } from '../db';
import type { Session } from 'express-session';

const router = express.Router();

// Schemas for validation
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const emailVerificationTokenSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format')
});

const passwordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// Add session data type
declare module 'express-session' {
  interface SessionData {
    userId: number;
    role: string;
  }
}

// Get current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(err => {
        if (err) console.error('Session destruction error:', err);
      });
      return res.status(401).json({ message: 'User not found' });
    }

    // Return user data without password
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User registration
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const validationResult = insertUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid registration data', 
        errors: validationResult.error.errors 
      });
    }
    
    const userData = validationResult.data;
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    
    // Check if email already exists
    const userWithEmail = await storage.getUserByEmail(userData.email);
    if (userWithEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    // Create user with unverified status
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
      status: 'unverified',
      createdAt: new Date() // This might need to be removed depending on your schema
    });
    
    // Generate and save email verification token
    const verificationToken = await generateVerificationToken();
    
    await storage.createEmailVerification({
      userId: user.id,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    
    // Send verification email
    await sendVerificationEmail(user.email, user.firstName, verificationToken);
    
    res.status(201).json({ 
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user.id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Registration error occurred');
    res.status(500).json({ message: 'Server error' });
  }
});

// User login
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ message: 'Invalid login data' });
    }

    const { username, password } = validationResult.data;

    // Find user
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // IMPORTANT: For demo purposes - always allow login with known demo credentials
    const isDemoAccount = 
      (username === 'learner' && password === 'password') ||
      (username === 'tutor' && password === 'password') ||
      (username === 'iqa' && password === 'password');
    
    if (isDemoAccount) {
      console.log('Demo account login successful');
    } else {
      // Regular password verification
      try {
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          console.log('Password mismatch for user:', username);
          return res.status(401).json({ message: 'Invalid username or password' });
        }
      } catch (bcryptError) {
        console.error('Bcrypt comparison error:', bcryptError);
        return res.status(401).json({ message: 'Invalid username or password' });
      }
    }

    // Check user status
    if (user.status === 'unverified') {
      return res.status(403).json({ 
        message: 'Email verification required',
        pendingVerification: true
      });
    } else if (user.status === 'pending_approval') {
      return res.status(403).json({ 
        message: 'Account pending approval',
        pendingApproval: true
      });
    } else if (user.status === 'suspended' || user.status === 'deactivated') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    // Update last login time
    await storage.updateUser(user.id, {
      lastLoginAt: new Date()
    });

    // Set session data
    req.session.userId = user.id;
    req.session.role = user.role;

    // Return user data (excluding password)
    const { password: _, ...userData } = user;
    
    res.json({
      message: 'Login successful',
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Mock login for development/testing
router.post('/mock-login', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }
    
    let username = '';
    
    switch (role) {
      case 'learner':
        username = 'learner';
        break;
      case 'assessor':
        username = 'tutor';
        break;
      case 'iqa':
        username = 'iqa';
        break;
      case 'admin':
        username = 'admin';
        break;
      case 'training_provider':
        username = 'provider';
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Find user
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ message: 'Demo user not found' });
    }
    
    // Set session data
    req.session.userId = user.id;
    req.session.role = user.role;
    
    // Return user data (excluding password)
    const { password: _, ...userData } = user;
    
    res.json({
      message: 'Mock login successful',
      user: userData
    });
  } catch (error) {
    console.error('Mock login error:', error);
    res.status(500).json({ message: 'Server error during mock login' });
  }
});

// User logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const validationResult = emailVerificationTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const { token } = validationResult.data;
    
    // Find verification record
    const verification = await storage.getEmailVerificationByToken(token);
    
    if (!verification) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Check if token is expired
    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ message: 'Verification token has expired' });
    }
    
    // Update user status
    const user = await storage.getUser(verification.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user status based on role
    if (['admin', 'operations', 'training_provider', 'assessor', 'iqa'].includes(user.role)) {
      // These roles are immediately active
      await storage.updateUserStatus(user.id, 'active');
    } else {
      // Learners need admin approval
      await storage.updateUserStatus(user.id, 'pending_approval');
    }
    
    // Mark verification as used
    await storage.updateEmailVerification(verification.id, {
      verifiedAt: new Date()
    });
    
    res.json({ 
      message: user.role === 'learner' 
        ? 'Email verified. Your account is pending approval by an administrator.' 
        : 'Email verified. You can now log in.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request password reset
router.post('/request-password-reset', authRateLimiter, async (req, res) => {
  try {
    const validationResult = passwordResetRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    const { email } = validationResult.data;
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    // For security, don't reveal if the email exists or not
    if (!user) {
      return res.json({ message: 'If your email is registered, you will receive password reset instructions' });
    }
    
    // Generate reset token
    const resetToken = await generateVerificationToken();
    
    // Save reset token (reusing email verification table)
    await storage.createEmailVerification({
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
    });
    
    // Send reset email (implementation needed in email service)
    // await sendPasswordResetEmail(user.email, user.firstName, resetToken);
    
    res.json({ message: 'If your email is registered, you will receive password reset instructions' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const validationResult = passwordResetSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid password reset data',
        errors: validationResult.error.errors
      });
    }

    const { token, password } = validationResult.data;
    
    // Find verification record
    const verification = await storage.getEmailVerificationByToken(token);
    
    if (!verification) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Check if token is expired
    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ message: 'Password reset token has expired' });
    }
    
    // Get user
    const user = await storage.getUser(verification.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update user password
    await storage.updateUser(user.id, {
      password: hashedPassword
    });
    
    // Mark verification as used
    await storage.updateEmailVerification(verification.id, {
      verifiedAt: new Date()
    });
    
    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;