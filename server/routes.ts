import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import { z } from "zod";
import { handleUserMessage, generateResourceRecommendations, analyzeApprenticeshipStandard } from "./ai-assistant";
import OpenAI from "openai";
import fileUpload from 'express-fileupload';
import rateLimit from 'express-rate-limit';
import { aiRateLimiter } from './middleware/rateLimiter';
import * as fs from 'fs';
import * as path from 'path';
import { hashPassword, comparePassword } from "./auth/password";
import { generateToken, generateVerificationUrl } from "./auth/email-verification";
import authRouter from './routes/auth';
import emailVerificationRouter from './routes/email-verification';
import otjLogRouter from './routes/otj-logs';
import reviewRouter from './routes/reviews';
import ilrRouter from './routes/ilr';
import weeklyOtjRouter from './routes/weekly-otj';
import aiAssistantRouter from './routes/ai-assistant';
import { 
  insertUserSchema, 
  insertEvidenceItemSchema, 
  insertOtjLogEntrySchema, 
  insertFeedbackItemSchema, 
  insertTaskSchema
} from "@shared/schema";
import connectPgSimple from 'connect-pg-simple';

// Create database session store
const PgSession = connectPgSimple(session);

// Session type augmentation
declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
  }
}

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Role-based access middleware
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.session.userId || !req.session.role || !roles.includes(req.session.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Enforce session secret in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required for production');
  }
  
  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  Using default session secret. Set SESSION_SECRET for production!');
  }

  // Setup session middleware - use PostgreSQL if DATABASE_URL provided, otherwise in-memory
  const sessionConfig: session.SessionOptions = {
    cookie: { 
      maxAge: 86400000, // 24 hours
      secure: false, // Set to false for development to work in HTTP
      sameSite: 'lax'
    },
    resave: false,
    saveUninitialized: false,
    secret: sessionSecret
  };

  // Add PostgreSQL session store if DATABASE_URL is provided
  if (process.env.DATABASE_URL) {
    sessionConfig.store = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 60 // Prune expired sessions every hour
    });
    console.log('✓ Using PostgreSQL session store');
  } else {
    console.log('⚠️  Using in-memory session store (sessions lost on restart)');
  }

  app.use(session(sessionConfig));

  // Register API Routes - Use only one route registration
  app.use('/api/auth', authRouter);
  app.use('/api/email-verification', emailVerificationRouter);
  app.use('/api/otj-logs', otjLogRouter);
  app.use('/api/reviews', reviewRouter);
  app.use('/api/ilr', ilrRouter);
  app.use('/api/weekly-otj', weeklyOtjRouter);
  app.use('/api/ai-assistant', aiAssistantRouter);

  // API Routes for Weekly OTJ Tracking - with pagination
  app.get("/api/weekly-tracking", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get learner profile to determine learner ID
      let learnerId = userId;
      
      if (req.session.role !== 'learner') {
        // For non-learners, they need to specify a learner ID
        if (req.query.learnerId) {
          learnerId = parseInt(req.query.learnerId as string);
          
          // Check if this user has permission to view this learner
          const canAccess = await canAccessLearnerProfile(req.session.userId!, req.session.role, learnerId);
          if (!canAccess) {
            return res.status(403).json({ message: "You don't have permission to view this learner's data" });
          }
        } else {
          return res.status(400).json({ message: "learnerId is required for non-learner users" });
        }
      } else {
        // For learners, get their profile
        const profile = await storage.getLearnerProfileByUserId(userId);
        if (profile) {
          learnerId = profile.learnerId || userId;
        }
      }
      
      // Date range filtering - default to last 2 years if not specified
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date();
        
      // For non-admin roles, restrict how far back they can go (GDPR/data protection)
      let startDate: Date;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
      } else {
        // Default - go back 2 years
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2);
      }
      
      // Admins can override the 2-year limit
      if (req.session.role !== 'admin' && req.session.role !== 'operations') {
        // Ensure start date is not more than 2 years back for non-admins
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        
        if (startDate < twoYearsAgo) {
          startDate = twoYearsAgo;
        }
      }
      
      // Status filtering
      const statusFilter = req.query.status 
        ? (req.query.status as string).split(',') 
        : null;
        
      // Get total count for pagination
      const totalTracking = await storage.getWeeklyTrackingCountByLearnerId(
        learnerId, 
        startDate, 
        endDate, 
        statusFilter
      );
      
      // Get weekly tracking entries with pagination
      const weeklyTracking = await storage.getWeeklyTrackingByLearnerId(
        learnerId, 
        startDate, 
        endDate, 
        statusFilter,
        limit,
        offset
      );
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(totalTracking / limit);
      
      return res.status(200).json({
        items: weeklyTracking,
        pagination: {
          total: totalTracking,
          page,
          limit,
          pages: totalPages
        }
      });
    } catch (error) {
      console.error("Get weekly tracking error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI Assistant endpoints
  app.post("/api/ai/chat", requireAuth, aiRateLimiter, async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Get user profile information for context
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get learner KSBs if user is a learner
      let ksbElements = [];
      let learningGoals = [];
      let otjHoursThisWeek = 0;
      let minimumWeeklyOtjHours = 0;
      
      if (user.role === 'learner') {
        // Get learner profile
        const profile = await storage.getLearnerProfileByUserId(userId);
        
        if (profile) {
          // Get KSBs
          ksbElements = await storage.getKsbElementsByStandard(profile.standardId);
          
          // Get learning goals
          learningGoals = await storage.getLearningGoalsByLearnerId(profile.id);
          
          // Get OTJ hours for current week
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday of current week
          weekStart.setHours(0, 0, 0, 0);
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6); // Sunday of current week
          weekEnd.setHours(23, 59, 59, 999);
          
          const otjLogs = await storage.getOtjLogEntriesByLearnerIdAndDateRange(
            profile.id,
            weekStart,
            weekEnd
          );
          
          // Calculate total hours this week
          otjHoursThisWeek = otjLogs.reduce((total, log) => {
            return total + parseFloat(log.hours.toString());
          }, 0);
          
          // Get minimum OTJ hours requirement from standard
          const standard = await storage.getApprenticeshipStandard(profile.standardId);
          if (standard) {
            // Convert annual hours to weekly
            minimumWeeklyOtjHours = standard.minimumOtjHours / 52;
          }
        }
      }
      
      // Process message with AI
      const response = await handleUserMessage({
        userId,
        message,
        ksbElements,
        learningGoals,
        otjHoursThisWeek,
        minimumWeeklyOtjHours
      });
      
      // Save conversation
      await storage.createAiAssistantConversation({
        userId,
        message,
        response: response.text,
        metadata: response.metadata,
        createdAt: new Date()
      });
      
      return res.status(200).json(response);
    } catch (error) {
      console.error("AI assistant error:", error);
      return res.status(500).json({ message: "Error processing your request" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to check if a user can access a learner's profile
async function canAccessLearnerProfile(
  userId: number, 
  userRole: string, 
  learnerId: number
): Promise<boolean> {
  // Admins can access any learner profile
  if (userRole === 'admin' || userRole === 'operations') {
    return true;
  }
  
  // Get the learner profile to check relationships
  const learnerUser = await storage.getUser(learnerId);
  
  if (!learnerUser || learnerUser.role !== 'learner') {
    return false; // Not a valid learner
  }
  
  const learnerProfile = await storage.getLearnerProfileByUserId(learnerId);
  
  if (!learnerProfile) {
    return false; // No profile found
  }
  
  // Check if this user is the tutor/assessor for this learner
  if (userRole === 'assessor' && learnerProfile.tutorId === userId) {
    return true;
  }
  
  // Check if this user is the IQA for this learner
  if (userRole === 'iqa' && learnerProfile.iqaId === userId) {
    return true;
  }
  
  // Check if this user is from the training provider assigned to this learner
  if (userRole === 'training_provider' && learnerProfile.trainingProviderId === userId) {
    return true;
  }
  
  return false;
}