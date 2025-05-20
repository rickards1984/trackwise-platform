import express from 'express';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { generateToken, generateVerificationUrl } from '../auth/email-verification';
import { sendVerificationEmail } from '../services/email';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Configure rate limiting for login attempts
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: { 
    message: 'Too many login attempts, please try again after 15 minutes',
    error: 'rate_limit_exceeded'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Configure a less strict rate limiter for registration
const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 account registrations per hour per IP
  message: { 
    message: 'Too many registration attempts, please try again later',
    error: 'rate_limit_exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// User registration schema
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['learner', 'admin', 'training_provider', 'assessor', 'iqa', 'operations']).optional().default('learner'),
  avatarUrl: z.string().optional().nullable(),
});

// Login schema
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// Reset password schema
const resetPasswordSchema = z.object({
  email: z.string().email(),
});

// User registration
router.post('/register', registrationRateLimiter, async (req, res) => {
  try {
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ message: 'Invalid data', errors: validationResult.error.errors });
    }

    const validatedData = validationResult.data;

    // Prevent assignment of protected roles during registration
    if (validatedData.role && ['admin', 'operations', 'iqa'].includes(validatedData.role)) {
      return res.status(403).json({ 
        message: 'You cannot register with this role',
        error: 'forbidden_role_assignment'
      });
    }

    // Force regular users to be 'learner' by default for security
    if (!req.session?.userId || req.session?.role !== 'admin') {
      validatedData.role = 'learner';
    }

    // Check if username exists
    const existingUser = await storage.getUserByUsername(validatedData.username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if email exists
    const existingEmail = await storage.getUserByEmail(validatedData.email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
    
    // Create user
    const user = await storage.createUser({
      ...validatedData,
      password: hashedPassword,
      status: 'unverified', // Initial status is unverified until email is confirmed
      avatarUrl: null,
      createdAt: new Date(),
      lastLoginAt: null
    });
    
    // Create verification token and send email
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration
    
    // Store verification record
    await storage.createEmailVerification({
      userId: user.id,
      email: user.email,
      token,
      expiresAt,
      verified: false
    });
    
    // Send verification email
    await sendVerificationEmail(user.email, token, user.firstName);
    
    // Return success without sending the full user object for security
    res.status(201).json({ 
      message: 'User registered successfully. Please check your email to verify your account.',
      userId: user.id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error in user registration:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User login
router.post('/login', loginRateLimiter, async (req, res) => {
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

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
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
      return res.status(403).json({ 
        message: 'Account not active',
        accountLocked: true
      });
    }

    // Update last login time
    await storage.updateUser(user.id, {
      lastLoginAt: new Date()
    });

    // Set session
    if (req.session) {
      req.session.userId = user.id;
      req.session.role = user.role;
    }

    // Return user information
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      user: userWithoutPassword,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logout successful' });
    });
  } else {
    res.status(200).json({ message: 'No active session' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request password reset
router.post('/request-reset', async (req, res) => {
  try {
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    const { email } = validationResult.data;
    const user = await storage.getUserByEmail(email);
    
    // Always return success even if email not found (security best practice)
    if (!user) {
      return res.status(200).json({ message: 'If your email is in our system, you will receive a reset link shortly.' });
    }

    // TODO: Implement actual password reset flow
    // Instead of sending a fake success, send a 501 Not Implemented
    return res.status(501).json({ 
      message: 'Password reset functionality not implemented yet',
      todo: true
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// For test purposes only (to be removed in production)
router.post('/mock-login', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const { role } = req.body;
    let user;

    if (role === 'admin') {
      user = await storage.getUserByUsername('admin');
    } else if (role === 'learner') {
      user = await storage.getUserByUsername('learner');
    } else if (role === 'tutor' || role === 'assessor') {
      user = await storage.getUserByUsername('tutor');
    } else if (role === 'iqa') {
      user = await storage.getUserByUsername('iqa');
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (!user) {
      return res.status(404).json({ message: 'Test user not found' });
    }

    // Set session
    if (req.session) {
      req.session.userId = user.id;
      req.session.role = user.role;
    }

    // Create token and send verification email for demo purposes
    if (req.body.needsVerification) {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration
      
      // Store verification record
      await storage.createEmailVerification({
        userId: user.id,
        email: user.email,
        token,
        expiresAt,
        verified: false
      });
      
      // Send verification email
      await sendVerificationEmail(user.email, token, user.firstName);
    }

    // Return user information
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      user: userWithoutPassword,
      message: 'Mock login successful'
    });
  } catch (error) {
    console.error('Mock login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;