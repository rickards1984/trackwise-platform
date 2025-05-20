import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import fs from "fs";
import path from "path";
import MemoryStore from "memorystore";
import { z } from "zod";
import { handleUserMessage, generateResourceRecommendations, analyzeApprenticeshipStandard } from "./ai-assistant";
import OpenAI from "openai";
import fileUpload from 'express-fileupload';
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

// Create session store
const SessionStore = MemoryStore(session);

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
  // Setup session middleware
  app.use(session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new SessionStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "skilltrack-session-secret"
  }));

  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Compare password with hashed password in database
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if user is verified
      if (user.status === 'unverified') {
        return res.status(403).json({ 
          message: "Your email address has not been verified. Please check your email for verification instructions.",
          needsVerification: true
        });
      }
      
      // Check if user is pending approval
      if (user.status === 'pending_approval') {
        return res.status(403).json({ 
          message: "Your account is pending administrator approval. Please check back later.",
          pendingApproval: true
        });
      }
      
      // Check if user is suspended or deactivated
      if (user.status === 'suspended' || user.status === 'deactivated') {
        return res.status(403).json({ 
          message: "Your account has been " + user.status + ". Please contact an administrator.",
          accountLocked: true
        });
      }
      
      // Update last login time
      await storage.updateUser(user.id, { lastLoginAt: new Date() });
      
      // Set session data
      req.session.userId = user.id;
      req.session.role = user.role;
      
      return res.status(200).json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user with hashed password and unverified status
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        status: 'unverified'
      });
      
      // Send verification email
      const emailSent = await createVerificationRequest(user.id, user.email);
      
      if (!emailSent) {
        console.error("Failed to send verification email to:", user.email);
      }
      
      // Return success but don't set session data until email is verified
      return res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        needsVerification: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.redirect('/verification-error');
      }
      
      const verified = await verifyEmail(token);
      
      if (!verified) {
        return res.redirect('/verification-error');
      }
      
      return res.redirect('/verification-success');
    } catch (error) {
      console.error("Email verification error:", error);
      return res.redirect('/verification-error');
    }
  });
  
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal that the email doesn't exist for security reasons
        return res.status(200).json({ 
          message: "If your email exists in our system, a verification link has been sent to your inbox." 
        });
      }
      
      if (user.status !== 'unverified') {
        return res.status(400).json({ 
          message: "This account is already verified or in another state that doesn't require verification." 
        });
      }
      
      // Send verification email
      const emailSent = await createVerificationRequest(user.id, user.email);
      
      if (!emailSent) {
        console.error("Failed to resend verification email to:", user.email);
        return res.status(500).json({ message: "Failed to send verification email. Please try again later." });
      }
      
      return res.status(200).json({ 
        message: "If your email exists in our system, a verification link has been sent to your inbox." 
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        // Session exists but user doesn't - should never happen but handle it
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      
      return res.status(200).json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl
      });
    } catch (error) {
      console.error("Get current user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User Routes
  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user profile
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      
      // Security check: Ensure users can only update their own profile unless they're admin
      if (req.session.role !== 'admin' && req.session.role !== 'operations' && req.session.userId !== targetUserId) {
        return res.status(403).json({ message: "You can only edit your own profile" });
      }

      const user = await storage.getUser(targetUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Define what fields can be updated by regular users
      const updateData: Partial<User> = {};
      
      // Regular users can only update firstName and lastName
      if (req.body.firstName) updateData.firstName = req.body.firstName;
      if (req.body.lastName) updateData.lastName = req.body.lastName;
      
      // Only admins can update critical fields like email, username, role
      if (['admin', 'operations'].includes(req.session.role)) {
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.username) updateData.username = req.body.username;
        if (req.body.role) updateData.role = req.body.role;
        if (req.body.status) updateData.status = req.body.status;
      }
      
      // Avatar URL can be updated by any user
      if (req.body.avatarUrl) updateData.avatarUrl = req.body.avatarUrl;
      
      // Update the user record
      const updatedUser = await storage.updateUser(targetUserId, updateData);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      // Don't return password
      const { password, ...userWithoutPassword } = updatedUser;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Separate endpoint for password change for better security
  app.patch("/api/users/:id/password", requireAuth, async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      
      // Users can only change their own password, except admins
      if (req.session.role !== 'admin' && req.session.userId !== targetUserId) {
        return res.status(403).json({ message: "You can only change your own password" });
      }
      
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      
      const user = await storage.getUser(targetUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only check current password for non-admin users
      if (req.session.role !== 'admin') {
        // Verify current password
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        
        // Compare passwords
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      const updated = await storage.updateUser(targetUserId, { 
        password: hashedPassword 
      });
      
      if (!updated) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Update password error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // KSB Routes
  app.get("/api/ksbs", requireAuth, async (req, res) => {
    try {
      const standardId = req.query.standardId ? parseInt(req.query.standardId as string) : null;
      
      // If standardId is provided, get KSBs for that standard
      if (standardId) {
        const ksbs = await storage.getKsbElementsByStandard(standardId);
        return res.status(200).json(ksbs);
      }
      
      // If no standardId is provided, try to get the learner's profile to determine their standard
      if (req.session.role === 'learner') {
        const profile = await storage.getLearnerProfileByUserId(req.session.userId!);
        
        if (profile) {
          const ksbs = await storage.getKsbElementsByStandard(profile.standardId);
          return res.status(200).json(ksbs);
        }
      }
      
      // If we can't determine a standard, return an empty array
      // This is better than returning an error as the client can handle an empty array
      return res.status(200).json([]);
    } catch (error) {
      console.error("Get KSBs error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Apprenticeship Standard Routes
  app.get("/api/standards", requireAuth, async (req, res) => {
    try {
      const standards = await storage.getAllApprenticeshipStandards();
      return res.status(200).json(standards);
    } catch (error) {
      console.error("Get standards error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Learner Profile Routes
  app.get("/api/learner-profile", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getLearnerProfileByUserId(req.session.userId!);
      
      if (!profile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      // Get related standard
      const standard = await storage.getApprenticeshipStandard(profile.standardId);
      
      if (!standard) {
        return res.status(404).json({ message: "Apprenticeship standard not found" });
      }
      
      return res.status(200).json({
        ...profile,
        standard: {
          title: standard.title,
          level: standard.level,
          description: standard.description,
          minimumOtjHours: standard.minimumOtjHours
        }
      });
    } catch (error) {
      console.error("Get learner profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Evidence Routes
  app.get("/api/evidence", requireAuth, async (req, res) => {
    try {
      const learnerId = req.query.learnerId ? parseInt(req.query.learnerId as string) : req.session.userId!;
      
      // Check permissions - only allow users to see their own evidence or if they are assessor/IQA/admin
      if (learnerId !== req.session.userId && !["assessor", "iqa", "admin", "training_provider"].includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to view this evidence" });
      }
      
      const evidenceItems = await storage.getEvidenceItemsByLearnerId(learnerId);
      
      // For each evidence item, get the associated KSBs
      const enrichedItems = await Promise.all(
        evidenceItems.map(async (item) => {
          const ksbs = await storage.getKsbsByEvidenceId(item.id);
          
          return {
            ...item,
            ksbs: ksbs.map(ksb => ({
              id: ksb.id,
              type: ksb.type,
              code: ksb.code,
              description: ksb.description
            }))
          };
        })
      );
      
      return res.status(200).json(enrichedItems);
    } catch (error) {
      console.error("Get evidence error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/evidence/:id", requireAuth, async (req, res) => {
    try {
      const evidenceId = parseInt(req.params.id);
      const evidence = await storage.getEvidenceItem(evidenceId);
      
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      // Check permissions - only allow users to see their own evidence or if they are assessor/IQA/admin
      if (evidence.learnerId !== req.session.userId && !["assessor", "iqa", "admin", "training_provider"].includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to view this evidence" });
      }
      
      // Get associated KSBs
      const ksbs = await storage.getKsbsByEvidenceId(evidenceId);
      
      // Get feedback
      const feedback = await storage.getFeedbackItemsByRelatedItem("evidence", evidenceId);
      
      // Enrich feedback with sender details
      const enrichedFeedback = await Promise.all(
        feedback.map(async (item) => {
          const sender = await storage.getUser(item.senderId);
          
          return {
            ...item,
            sender: sender ? {
              id: sender.id,
              firstName: sender.firstName,
              lastName: sender.lastName,
              role: sender.role,
              avatarUrl: sender.avatarUrl
            } : null
          };
        })
      );
      
      return res.status(200).json({
        ...evidence,
        ksbs: ksbs.map(ksb => ({
          id: ksb.id,
          type: ksb.type,
          code: ksb.code,
          description: ksb.description
        })),
        feedback: enrichedFeedback
      });
    } catch (error) {
      console.error("Get evidence detail error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/evidence", requireAuth, async (req, res) => {
    try {
      // Only learners can create evidence
      if (req.session.role !== "learner") {
        return res.status(403).json({ message: "Forbidden: Only learners can create evidence" });
      }
      
      // Handle form data or JSON data
      let evidenceData: any = {};
      let ksbIds: number[] = [];
      
      // Check if request has files (multipart form data)
      if (req.files && Object.keys(req.files).length > 0) {
        // Process multipart form data
        const uploadedFile = req.files.file;
        
        // Store the file if it exists
        let fileUrl = "";
        let originalFilename = "";
        let mimetype = "";
        let filesize = 0;
        
        if (uploadedFile) {
          // Ensure we're working with a consistent type
          const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
          
          if (!file) {
            return res.status(400).json({ message: "Invalid file upload format" });
          }
          
          // Store file metadata
          originalFilename = file.name;
          mimetype = file.mimetype;
          filesize = file.size;
          
          // Create a unique filename to prevent overwriting
          const fileName = `${Date.now()}-${file.name}`;
          
          // Create uploads directory if it doesn't exist
          const uploadDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          // Set the full path for saving the file
          const uploadPath = path.join(uploadDir, fileName);
          
          try {
            // Save the file to disk
            await file.mv(uploadPath);
            fileUrl = `/uploads/${fileName}`;
            console.log(`Evidence file saved: ${uploadPath}`);
          } catch (error) {
            console.error("File upload error:", error);
            fileUrl = "";
            return res.status(500).json({ message: "File upload failed" });
          }
        }
        
        // Process other form data
        evidenceData = {
          title: req.body.title,
          description: req.body.description,
          evidenceType: req.body.evidenceType,
          submissionDate: new Date(req.body.submissionDate),
          status: req.body.status || 'draft',
          fileUrl: fileUrl || req.body.fileUrl,
          externalLink: req.body.externalLink,
          reflection: req.body.reflection,
          learnerId: req.session.userId,
          // Add file metadata if a file was uploaded
          originalFilename: originalFilename || null,
          mimetype: mimetype || null,
          filesize: filesize || null
        };
        
        // Parse ksbIds from form data
        if (req.body.ksbIds) {
          try {
            ksbIds = JSON.parse(req.body.ksbIds);
          } catch (e) {
            console.error("Error parsing ksbIds:", e);
          }
        }
      } else {
        // Process JSON data
        evidenceData = {
          ...req.body,
          learnerId: req.session.userId,
          submissionDate: new Date()
        };
        
        if (req.body.ksbIds && Array.isArray(req.body.ksbIds)) {
          ksbIds = req.body.ksbIds;
        }
      }
      
      // Validate evidence data
      const validEvidenceData = insertEvidenceItemSchema.parse(evidenceData);
      
      // Create evidence item
      const evidence = await storage.createEvidenceItem(validEvidenceData);
      
      // Handle KSB mappings if provided
      if (ksbIds.length > 0) {
        await Promise.all(
          ksbIds.map(async (ksbId: number) => {
            await storage.createEvidenceKsbMapping({
              evidenceId: evidence.id,
              ksbId
            });
          })
        );
      }
      
      return res.status(201).json(evidence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid evidence data", errors: error.errors });
      }
      console.error("Create evidence error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.patch("/api/evidence/:id", requireAuth, async (req, res) => {
    try {
      const evidenceId = parseInt(req.params.id);
      const evidence = await storage.getEvidenceItem(evidenceId);
      
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      // Check permissions - learners can only update their own evidence if not approved
      // Assessors, IQAs, and admins can update status
      if (req.session.role === "learner") {
        if (evidence.learnerId !== req.session.userId) {
          return res.status(403).json({ message: "Forbidden: You don't have permission to update this evidence" });
        }
        
        if (evidence.status === "approved") {
          return res.status(403).json({ message: "Forbidden: Cannot update approved evidence" });
        }
      } else if (!["assessor", "iqa", "admin"].includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to update evidence" });
      }
      
      // Limit what can be updated based on role
      let updateData: Partial<typeof evidence> = {};

      // Check for file replacement
      const hasFileUpload = req.files && Object.keys(req.files).length > 0 && req.files.file;
      
      if (req.session.role === "learner") {
        // Learners can update title, description, evidenceType, reflection, externalLink, and status (only to 'submitted')
        if (req.body.title) updateData.title = req.body.title;
        if (req.body.description) updateData.description = req.body.description;
        if (req.body.evidenceType) updateData.evidenceType = req.body.evidenceType;
        if (req.body.reflection) updateData.reflection = req.body.reflection;
        if (req.body.externalLink) updateData.externalLink = req.body.externalLink;
        if (req.body.status && req.body.status === "submitted") updateData.status = "submitted";
        
        // If submitting, update submission date
        if (req.body.status && req.body.status === "submitted" && evidence.status === "draft") {
          updateData.submissionDate = new Date();
        }
        
        // Handle file replacement if a new file was uploaded
        if (hasFileUpload) {
          const uploadedFile = req.files.file;
          const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
          
          if (file) {
            // Create a unique filename to prevent overwriting
            const fileName = `${Date.now()}-${file.name}`;
            
            // Create uploads directory if it doesn't exist
            const uploadDir = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Set the full path for saving the file
            const uploadPath = path.join(uploadDir, fileName);
            
            try {
              // If there's an existing file, attempt to delete it
              if (evidence.fileUrl) {
                const oldFilePath = path.join(process.cwd(), evidence.fileUrl.replace(/^\//, ''));
                if (fs.existsSync(oldFilePath)) {
                  fs.unlinkSync(oldFilePath);
                  console.log(`Deleted old file: ${oldFilePath}`);
                }
              }
              
              // Save the new file to disk
              await file.mv(uploadPath);
              updateData.fileUrl = `/uploads/${fileName}`;
              
              // Update file metadata
              updateData.originalFilename = file.name;
              updateData.mimetype = file.mimetype;
              updateData.filesize = file.size;
              
              console.log(`Evidence file replaced: ${uploadPath}`);
            } catch (error) {
              console.error("File replacement error:", error);
              return res.status(500).json({ message: "File replacement failed" });
            }
          }
        }
      } else {
        // Assessors, IQAs, and admins can update status and add feedback
        if (req.body.status) updateData.status = req.body.status;
        if (req.body.feedbackId) updateData.feedbackId = req.body.feedbackId;
        
        // Add timestamps for specific status transitions
        if (req.body.status === "in_review" && evidence.status === "submitted") {
          updateData.reviewStartDate = new Date();
        } else if (req.body.status === "approved" && evidence.status !== "approved") {
          updateData.approvedDate = new Date();
        }
      }
      
      // Only proceed with update if there are changes to make
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const updatedEvidence = await storage.updateEvidenceItem(evidenceId, updateData);
      
      // Handle KSB mappings if provided (for learners only)
      if (req.session.role === "learner" && req.body.ksbIds && Array.isArray(req.body.ksbIds)) {
        try {
          // First, delete existing mappings for this evidence item
          await storage.deleteEvidenceKsbMappingsByEvidenceId(evidence.id);
          
          // Then create new mappings based on the updated list
          await Promise.all(
            req.body.ksbIds.map(async (ksbId: number) => {
              await storage.createEvidenceKsbMapping({
                evidenceId: evidence.id,
                ksbId
              });
            })
          );
        } catch (error) {
          console.error("Error updating KSB mappings:", error);
          // Continue with the response even if KSB mapping update fails
          // The evidence update itself was successful
        }
      }
      
      return res.status(200).json(updatedEvidence);
    } catch (error) {
      console.error("Update evidence error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // DELETE evidence endpoint
  app.delete("/api/evidence/:id", requireAuth, async (req, res) => {
    try {
      const evidenceId = parseInt(req.params.id);
      const evidence = await storage.getEvidenceItem(evidenceId);
      
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      // Check permissions - learners can only delete their own evidence if it's a draft
      // Assessors, IQAs, and admins can delete any evidence
      if (req.session.role === "learner") {
        if (evidence.learnerId !== req.session.userId) {
          return res.status(403).json({ message: "Forbidden: You don't have permission to delete this evidence" });
        }
        
        if (evidence.status !== "draft") {
          return res.status(403).json({ message: "Forbidden: Cannot delete submitted evidence" });
        }
      } else if (!["assessor", "iqa", "admin"].includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to delete evidence" });
      }
      
      // Delete associated file if it exists
      if (evidence.fileUrl) {
        try {
          const filePath = path.join(process.cwd(), evidence.fileUrl.replace(/^\//, ''));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file associated with evidence ID ${evidenceId}: ${filePath}`);
          }
        } catch (fileError) {
          console.error("Error deleting evidence file:", fileError);
          // Continue with deletion even if file cleanup fails
        }
      }
      
      // Delete KSB mappings
      await storage.deleteEvidenceKsbMappingsByEvidenceId(evidenceId);
      
      // Delete evidence record from database
      await storage.deleteEvidenceItem(evidenceId);
      
      return res.status(200).json({ message: "Evidence deleted successfully" });
    } catch (error) {
      console.error("Delete evidence error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // OTJ Log Routes
  app.get("/api/otj-logs", requireAuth, async (req, res) => {
    try {
      const learnerId = req.query.learnerId ? parseInt(req.query.learnerId as string) : req.session.userId!;
      
      // Check permissions - only allow users to see their own logs or if they are assessor/IQA/admin
      if (learnerId !== req.session.userId && !["assessor", "iqa", "admin", "training_provider"].includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to view these OTJ logs" });
      }
      
      // Handle date range filtering
      let entries;
      if (req.query.startDate && req.query.endDate) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(req.query.endDate as string);
        entries = await storage.getOtjLogEntriesByLearnerIdAndDateRange(learnerId, startDate, endDate);
      } else {
        entries = await storage.getOtjLogEntriesByLearnerId(learnerId);
      }
      
      // Enrich entries with KSB details if applicable
      const enrichedEntries = await Promise.all(
        entries.map(async (entry) => {
          if (!entry.ksbId) return entry;
          
          const ksb = await storage.getKsbElement(entry.ksbId);
          
          return {
            ...entry,
            ksb: ksb ? {
              id: ksb.id,
              type: ksb.type,
              code: ksb.code,
              description: ksb.description
            } : null
          };
        })
      );
      
      return res.status(200).json(enrichedEntries);
    } catch (error) {
      console.error("Get OTJ logs error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/otj-logs/:id", requireAuth, async (req, res) => {
    try {
      const logId = parseInt(req.params.id);
      const log = await storage.getOtjLogEntry(logId);
      
      if (!log) {
        return res.status(404).json({ message: "OTJ log not found" });
      }
      
      // Check permissions - only allow users to see their own logs or if they are assessor/IQA/admin
      if (log.learnerId !== req.session.userId && !["assessor", "iqa", "admin", "training_provider"].includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to view this OTJ log" });
      }
      
      // Get KSB details if applicable
      let ksbDetails = null;
      if (log.ksbId) {
        const ksb = await storage.getKsbElement(log.ksbId);
        if (ksb) {
          ksbDetails = {
            id: ksb.id,
            type: ksb.type,
            code: ksb.code,
            description: ksb.description
          };
        }
      }
      
      // Get verifier details if applicable
      let verifierDetails = null;
      if (log.verifierId) {
        const verifier = await storage.getUser(log.verifierId);
        if (verifier) {
          verifierDetails = {
            id: verifier.id,
            firstName: verifier.firstName,
            lastName: verifier.lastName,
            role: verifier.role
          };
        }
      }
      
      // Get IQA verifier details if applicable
      let iqaVerifierDetails = null;
      if (log.iqaVerifierId) {
        const iqaVerifier = await storage.getUser(log.iqaVerifierId);
        if (iqaVerifier) {
          iqaVerifierDetails = {
            id: iqaVerifier.id,
            firstName: iqaVerifier.firstName,
            lastName: iqaVerifier.lastName,
            role: iqaVerifier.role
          };
        }
      }
      
      return res.status(200).json({
        ...log,
        ksb: ksbDetails,
        verifier: verifierDetails,
        iqaVerifier: iqaVerifierDetails
      });
    } catch (error) {
      console.error("Get OTJ log detail error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/otj-logs", requireAuth, async (req, res) => {
    try {
      // Only learners can create OTJ logs
      if (req.session.role !== "learner") {
        return res.status(403).json({ message: "Forbidden: Only learners can create OTJ logs" });
      }
      
      const logData = insertOtjLogEntrySchema.parse({
        ...req.body,
        learnerId: req.session.userId
      });
      
      const log = await storage.createOtjLogEntry(logData);
      
      return res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid OTJ log data", errors: error.errors });
      }
      console.error("Create OTJ log error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.patch("/api/otj-logs/:id", requireAuth, async (req, res) => {
    try {
      const logId = parseInt(req.params.id);
      const log = await storage.getOtjLogEntry(logId);
      
      if (!log) {
        return res.status(404).json({ message: "OTJ log not found" });
      }
      
      // Check permissions - learners can only update their own logs if not approved
      // Assessors can verify
      // IQAs can IQA verify
      if (req.session.role === "learner") {
        if (log.learnerId !== req.session.userId) {
          return res.status(403).json({ message: "Forbidden: You don't have permission to update this OTJ log" });
        }
        
        if (log.status === "approved") {
          return res.status(403).json({ message: "Forbidden: Cannot update approved OTJ log" });
        }
      } else if (req.session.role === "assessor") {
        // For verifying
        if (req.body.verify === true) {
          const verifiedLog = await storage.verifyOtjLogEntry(logId, req.session.userId!);
          return res.status(200).json(verifiedLog);
        }
      } else if (req.session.role === "iqa") {
        // For IQA verifying
        if (req.body.iqaVerify === true) {
          const iqaVerifiedLog = await storage.iqaVerifyOtjLogEntry(logId, req.session.userId!);
          return res.status(200).json(iqaVerifiedLog);
        }
      } else if (req.session.role !== "admin" && req.session.role !== "training_provider") {
        return res.status(403).json({ message: "Forbidden: You don't have permission to update OTJ logs" });
      }
      
      // Handle normal updates
      let updateData: Partial<typeof log> = {};
      
      if (req.session.role === "learner") {
        // Learners can update date, hours, activityType, description, category, ksbId, and status (only to 'submitted')
        if (req.body.date) updateData.date = new Date(req.body.date);
        if (req.body.hours) updateData.hours = req.body.hours;
        if (req.body.activityType) updateData.activityType = req.body.activityType;
        if (req.body.description) updateData.description = req.body.description;
        if (req.body.category) updateData.category = req.body.category;
        if (req.body.ksbId) updateData.ksbId = req.body.ksbId;
        if (req.body.status && req.body.status === "submitted") updateData.status = "submitted";
      } else {
        // Assessors, IQAs, admins, and training providers can update status
        if (req.body.status) updateData.status = req.body.status;
      }
      
      const updatedLog = await storage.updateOtjLogEntry(logId, updateData);
      
      return res.status(200).json(updatedLog);
    } catch (error) {
      console.error("Update OTJ log error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Feedback Routes
  app.get("/api/feedback", requireAuth, async (req, res) => {
    try {
      // Get feedback for the current user
      const feedback = await storage.getFeedbackItemsByRecipientId(req.session.userId!);
      
      // Enrich feedback with sender details
      const enrichedFeedback = await Promise.all(
        feedback.map(async (item) => {
          const sender = await storage.getUser(item.senderId);
          
          return {
            ...item,
            sender: sender ? {
              id: sender.id,
              firstName: sender.firstName,
              lastName: sender.lastName,
              role: sender.role,
              avatarUrl: sender.avatarUrl
            } : null
          };
        })
      );
      
      return res.status(200).json(enrichedFeedback);
    } catch (error) {
      console.error("Get feedback error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/feedback", requireAuth, requireRole(["assessor", "iqa", "admin", "training_provider"]), async (req, res) => {
    try {
      const feedbackData = insertFeedbackItemSchema.parse({
        ...req.body,
        senderId: req.session.userId,
        date: new Date()
      });
      
      const feedback = await storage.createFeedbackItem(feedbackData);
      
      return res.status(201).json(feedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
      }
      console.error("Create feedback error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Task Routes
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      // Get tasks assigned to the current user
      const tasks = await storage.getTasksByAssignedToId(req.session.userId!);
      
      // Enrich tasks with KSB details if applicable and assigned by details
      const enrichedTasks = await Promise.all(
        tasks.map(async (task) => {
          let ksbDetails = null;
          if (task.ksbId) {
            const ksb = await storage.getKsbElement(task.ksbId);
            if (ksb) {
              ksbDetails = {
                id: ksb.id,
                type: ksb.type,
                code: ksb.code,
                description: ksb.description
              };
            }
          }
          
          const assignedBy = await storage.getUser(task.assignedById);
          
          return {
            ...task,
            ksb: ksbDetails,
            assignedBy: assignedBy ? {
              id: assignedBy.id,
              firstName: assignedBy.firstName,
              lastName: assignedBy.lastName,
              role: assignedBy.role
            } : null
          };
        })
      );
      
      return res.status(200).json(enrichedTasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/tasks", requireAuth, requireRole(["assessor", "iqa", "admin", "training_provider"]), async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        assignedById: req.session.userId
      });
      
      const task = await storage.createTask(taskData);
      
      return res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Create task error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Check permissions - learners can only update status of tasks assigned to them
      // Assessors, IQAs, admins, and training providers can update any task they created
      if (req.session.role === "learner") {
        if (task.assignedToId !== req.session.userId) {
          return res.status(403).json({ message: "Forbidden: You don't have permission to update this task" });
        }
        
        // Learners can only update status
        if (!req.body.status) {
          return res.status(400).json({ message: "Status is required" });
        }
        
        const updatedTask = await storage.updateTask(taskId, { status: req.body.status });
        return res.status(200).json(updatedTask);
      } else {
        if (task.assignedById !== req.session.userId && req.session.role !== "admin") {
          return res.status(403).json({ message: "Forbidden: You don't have permission to update this task" });
        }
        
        // Others can update any field
        const updatedTask = await storage.updateTask(taskId, req.body);
        return res.status(200).json(updatedTask);
      }
    } catch (error) {
      console.error("Update task error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard Routes
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      // Different dashboard data based on role
      if (req.session.role === "learner") {
        // Get learner profile
        const profile = await storage.getLearnerProfileByUserId(req.session.userId!);
        
        if (!profile) {
          return res.status(404).json({ message: "Learner profile not found" });
        }
        
        // Get apprenticeship standard
        const standard = await storage.getApprenticeshipStandard(profile.standardId);
        
        if (!standard) {
          return res.status(404).json({ message: "Apprenticeship standard not found" });
        }
        
        // Get recent evidence
        const evidence = await storage.getEvidenceItemsByLearnerId(req.session.userId!);
        const recentEvidence = evidence.sort((a, b) => 
          new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
        ).slice(0, 5);
        
        // Get OTJ log entries
        const now = new Date();
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        
        const otjLogs = await storage.getOtjLogEntriesByLearnerIdAndDateRange(
          req.session.userId!,
          oneMonthAgo,
          now
        );
        
        // Group OTJ logs by week
        const weeklyOtjData = otjLogs.reduce((acc: Record<string, any>, log) => {
          const date = new Date(log.date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          const weekKey = `${weekStart.toISOString().slice(0, 10)}_${weekEnd.toISOString().slice(0, 10)}`;
          
          if (!acc[weekKey]) {
            acc[weekKey] = {
              startDate: weekStart,
              endDate: weekEnd,
              hours: 0,
              status: null,
              entries: []
            };
          }
          
          acc[weekKey].hours += log.hours;
          acc[weekKey].entries.push(log);
          
          if (log.status === "approved") {
            acc[weekKey].status = "approved";
          } else if (log.status === "submitted" && acc[weekKey].status !== "approved") {
            acc[weekKey].status = "submitted";
          } else if (!acc[weekKey].status) {
            acc[weekKey].status = "draft";
          }
          
          return acc;
        }, {});
        
        // Convert to array and sort by date (most recent first)
        const weeklyOtjLogs = Object.values(weeklyOtjData).sort((a: any, b: any) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        
        // Get tasks
        const tasks = await storage.getTasksByAssignedToId(req.session.userId!);
        const pendingTasks = tasks.filter(task => task.status === "pending")
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        
        // Get feedback
        const feedback = await storage.getFeedbackItemsByRecipientId(req.session.userId!);
        const recentFeedback = feedback.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ).slice(0, 5);
        
        // Enrich feedback with sender details
        const enrichedFeedback = await Promise.all(
          recentFeedback.map(async (item) => {
            const sender = await storage.getUser(item.senderId);
            
            return {
              ...item,
              sender: sender ? {
                id: sender.id,
                firstName: sender.firstName,
                lastName: sender.lastName,
                role: sender.role,
                avatarUrl: sender.avatarUrl
              } : null
            };
          })
        );
        
        // Calculate progress
        const ksbElements = await storage.getKsbElementsByStandard(standard.id);
        const totalKsbs = ksbElements.length;
        
        // Count how many distinct KSBs are covered by approved evidence
        const approvedEvidenceItems = evidence.filter(item => item.status === "approved");
        const coveredKsbIds = new Set<number>();
        
        await Promise.all(
          approvedEvidenceItems.map(async (item) => {
            const ksbs = await storage.getKsbsByEvidenceId(item.id);
            ksbs.forEach(ksb => coveredKsbIds.add(ksb.id));
          })
        );
        
        const ksbsAchieved = coveredKsbIds.size;
        
        // Group KSBs by type
        const ksbsByType = ksbElements.reduce((acc: Record<string, any[]>, ksb) => {
          if (!acc[ksb.type]) {
            acc[ksb.type] = [];
          }
          acc[ksb.type].push(ksb);
          return acc;
        }, {});
        
        // Count achieved by type
        const ksbProgressByType = Object.entries(ksbsByType).map(([type, ksbs]) => {
          const achieved = ksbs.filter(ksb => coveredKsbIds.has(ksb.id)).length;
          return {
            type,
            achieved,
            total: ksbs.length
          };
        });
        
        // Calculate total OTJ hours
        const totalOtjHours = otjLogs
          .filter(log => log.status === "approved" && log.category === "otj")
          .reduce((sum, log) => sum + log.hours, 0);
        
        return res.status(200).json({
          apprenticeshipDetails: {
            title: standard.title,
            level: standard.level,
            startDate: profile.startDate,
            expectedEndDate: profile.expectedEndDate,
            minimumOtjHours: standard.minimumOtjHours
          },
          progress: {
            overall: Math.round((ksbsAchieved / totalKsbs) * 100),
            ksbsAchieved,
            totalKsbs,
            otjHours: totalOtjHours,
            ksbByType: ksbProgressByType
          },
          weeklyOtjLogs,
          recentEvidence,
          tasks: pendingTasks,
          feedback: enrichedFeedback
        });
      } else {
        // Admin, assessor, IQA, or training provider dashboard
        // This would be expanded in a real implementation with appropriate data
        return res.status(200).json({
          message: "Admin/staff dashboard not yet implemented"
        });
      }
    } catch (error) {
      console.error("Get dashboard error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Basic ILR data route (placeholder for demo)
  app.get("/api/ilr", requireAuth, requireRole(["admin", "training_provider"]), (req, res) => {
    return res.status(200).json({
      message: "ILR data would be available here in a full implementation"
    });
  });

  // Learning Goals Routes
  app.get("/api/learning-goals", requireAuth, async (req, res) => {
    try {
      // Get learning goals for the current user (if learner) or for a specific learner (if staff)
      const learnerId = req.query.learnerId ? parseInt(req.query.learnerId as string) : req.session.userId!;
      
      // Check permissions - only allow users to see their own goals or if they are tutor/IQA/admin
      if (learnerId !== req.session.userId && !["assessor", "iqa", "admin", "training_provider"].includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to view these learning goals" });
      }
      
      const goals = await storage.getLearningGoalsByLearnerId(learnerId);
      
      // Enrich goals with KSB details and tutor information
      const enrichedGoals = await Promise.all(
        goals.map(async (goal) => {
          const tutor = await storage.getUser(goal.tutorId);
          
          // Get KSB details if applicable
          let ksbDetails = [];
          if (goal.ksbIds && goal.ksbIds.length > 0) {
            const promises = goal.ksbIds.map(async (ksbId) => {
              const ksb = await storage.getKsbElement(ksbId);
              if (ksb) {
                return {
                  id: ksb.id,
                  type: ksb.type,
                  code: ksb.code,
                  description: ksb.description
                };
              }
              return null;
            });
            
            ksbDetails = (await Promise.all(promises)).filter(item => item !== null);
          }
          
          return {
            ...goal,
            tutor: tutor ? {
              id: tutor.id,
              firstName: tutor.firstName,
              lastName: tutor.lastName,
              role: tutor.role
            } : null,
            ksbs: ksbDetails
          };
        })
      );
      
      return res.status(200).json(enrichedGoals);
    } catch (error) {
      console.error("Get learning goals error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/learning-goals/:id", requireAuth, async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const goal = await storage.getLearningGoal(goalId);
      
      if (!goal) {
        return res.status(404).json({ message: "Learning goal not found" });
      }
      
      // Check permissions - only allow users to see their own goals or if they are tutor/IQA/admin
      if (goal.learnerId !== req.session.userId && !["assessor", "iqa", "admin", "training_provider"].includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to view this learning goal" });
      }
      
      // Get tutor details
      const tutor = await storage.getUser(goal.tutorId);
      
      // Get KSB details if applicable
      let ksbDetails = [];
      if (goal.ksbIds && goal.ksbIds.length > 0) {
        const promises = goal.ksbIds.map(async (ksbId) => {
          const ksb = await storage.getKsbElement(ksbId);
          if (ksb) {
            return {
              id: ksb.id,
              type: ksb.type,
              code: ksb.code,
              description: ksb.description
            };
          }
          return null;
        });
        
        ksbDetails = (await Promise.all(promises)).filter(item => item !== null);
      }
      
      return res.status(200).json({
        ...goal,
        tutor: tutor ? {
          id: tutor.id,
          firstName: tutor.firstName,
          lastName: tutor.lastName,
          role: tutor.role
        } : null,
        ksbs: ksbDetails
      });
    } catch (error) {
      console.error("Get learning goal detail error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/learning-goals", requireAuth, async (req, res) => {
    try {
      // Get current user's profile to verify the tutorId
      const profile = await storage.getLearnerProfileByUserId(req.session.userId!);
      
      if (!profile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      // Check if tutorId is provided or use the one from the profile
      const tutorId = req.body.tutorId || profile.tutorId;
      
      if (!tutorId) {
        return res.status(400).json({ message: "Tutor ID is required" });
      }
      
      // Create the learning goal
      const goalData = {
        ...req.body,
        learnerId: req.session.userId!,
        tutorId,
        status: 'active'
      };
      
      // Validate the goal data (convert targetDate to Date object)
      if (typeof goalData.targetDate === 'string') {
        goalData.targetDate = new Date(goalData.targetDate);
      }
      
      const goal = await storage.createLearningGoal(goalData);
      
      return res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid learning goal data", errors: error.errors });
      }
      console.error("Create learning goal error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.patch("/api/learning-goals/:id", requireAuth, async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const goal = await storage.getLearningGoal(goalId);
      
      if (!goal) {
        return res.status(404).json({ message: "Learning goal not found" });
      }
      
      // Check permissions - learners can only update their own goals
      // Tutors can update goals for learners they supervise
      if (req.session.role === "learner") {
        if (goal.learnerId !== req.session.userId) {
          return res.status(403).json({ message: "Forbidden: You don't have permission to update this learning goal" });
        }
      } else if (req.session.role === "assessor") {
        if (goal.tutorId !== req.session.userId) {
          return res.status(403).json({ message: "Forbidden: You don't have permission to update this learning goal" });
        }
      } else if (!["iqa", "admin", "training_provider"].includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to update learning goals" });
      }
      
      // Handle status changes - if marking as completed, add completion date
      let updateData: any = { ...req.body };
      
      if (req.body.status === "completed" && goal.status !== "completed") {
        updateData.completionDate = new Date();
      }
      
      // Convert target date string to Date object if provided
      if (typeof updateData.targetDate === 'string') {
        updateData.targetDate = new Date(updateData.targetDate);
      }
      
      const updatedGoal = await storage.updateLearningGoal(goalId, updateData);
      
      return res.status(200).json(updatedGoal);
    } catch (error) {
      console.error("Update learning goal error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI Teaching Assistant Routes
  app.post("/api/ai-assistant/chat", requireAuth, async (req, res) => {
    try {
      const { message, includeKsbs, includeOtjData } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Prepare input for AI assistant
      const input: any = {
        userId: req.session.userId!,
        message
      };
      
      // If KSBs should be included, fetch relevant ones
      if (includeKsbs) {
        const profile = await storage.getLearnerProfileByUserId(req.session.userId!);
        if (profile) {
          const ksbs = await storage.getKsbElementsByStandard(profile.standardId);
          input.ksbElements = ksbs;
        }
      }
      
      // If OTJ data should be included, fetch weekly hours
      if (includeOtjData) {
        const profile = await storage.getLearnerProfileByUserId(req.session.userId!);
        if (profile) {
          const standard = await storage.getApprenticeshipStandard(profile.standardId);
          
          // Calculate weekly OTJ hours target
          if (standard) {
            input.minimumWeeklyOtjHours = standard.minimumOtjHours;
            
            // Calculate this week's OTJ hours
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday of current week
            startOfWeek.setHours(0, 0, 0, 0);
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday of current week
            endOfWeek.setHours(23, 59, 59, 999);
            
            const weeklyEntries = await storage.getOtjLogEntriesByLearnerIdAndDateRange(
              req.session.userId!,
              startOfWeek,
              endOfWeek
            );
            
            // Sum up hours
            const totalHoursThisWeek = weeklyEntries.reduce((sum, entry) => sum + entry.hours, 0);
            input.otjHoursThisWeek = totalHoursThisWeek;
          }
        }
      }
      
      // Get learning goals if applicable
      const learningGoals = await storage.getLearningGoalsByLearnerId(req.session.userId!);
      if (learningGoals && learningGoals.length > 0) {
        input.learningGoals = learningGoals;
      }
      
      // Handle the user message and get AI response
      const response = await handleUserMessage(input);
      
      return res.status(200).json(response);
    } catch (error) {
      console.error("AI assistant error:", error);
      return res.status(500).json({ 
        message: "Error processing your request",
        text: "I'm having trouble responding right now. Please try again in a moment."
      });
    }
  });
  
  app.post("/api/ai-assistant/analyze-standard", requireAuth, requireRole(["admin", "training_provider"]), async (req, res) => {
    try {
      const { standardText } = req.body;
      
      if (!standardText) {
        return res.status(400).json({ message: "Standard text is required" });
      }
      
      const analysis = await analyzeApprenticeshipStandard(standardText);
      return res.status(200).json(analysis);
    } catch (error) {
      console.error("Standard analysis error:", error);
      return res.status(500).json({ message: "Error analyzing apprenticeship standard" });
    }
  });
  
  app.get("/api/ai-assistant/resource-recommendations", requireAuth, async (req, res) => {
    try {
      const ksbIdsParam = req.query.ksbIds as string;
      
      if (!ksbIdsParam) {
        return res.status(400).json({ message: "KSB IDs are required" });
      }
      
      const ksbIds = ksbIdsParam.split(',').map(id => parseInt(id));
      const recommendations = await generateResourceRecommendations(req.session.userId!, ksbIds);
      
      return res.status(200).json({ recommendations });
    } catch (error) {
      console.error("Resource recommendations error:", error);
      return res.status(500).json({ message: "Error generating resource recommendations" });
    }
  });
  
  app.get("/api/ai-assistant/config", requireAuth, async (req, res) => {
    try {
      const config = await storage.getAiAssistantConfig(req.session.userId!);
      
      if (!config) {
        // Return default config if not set yet
        return res.status(200).json({
          enabled: true,
          reminderFrequency: 'weekly',
          reminderChannels: ['email'],
          personalizedSettings: {}
        });
      }
      
      return res.status(200).json(config);
    } catch (error) {
      console.error("AI config error:", error);
      return res.status(500).json({ message: "Error fetching AI assistant configuration" });
    }
  });
  
  app.put("/api/ai-assistant/config", requireAuth, async (req, res) => {
    try {
      const { enabled, reminderFrequency, reminderChannels, personalizedSettings } = req.body;
      
      const config = await storage.createOrUpdateAiAssistantConfig({
        userId: req.session.userId!,
        enabled: enabled !== undefined ? enabled : true,
        reminderFrequency: reminderFrequency || 'weekly',
        reminderChannels: reminderChannels || ['email'],
        personalizedSettings: personalizedSettings || {}
      });
      
      return res.status(200).json(config);
    } catch (error) {
      console.error("AI config update error:", error);
      return res.status(500).json({ message: "Error updating AI assistant configuration" });
    }
  });
  
  app.get("/api/ai-assistant/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getAiAssistantConversationsByUserId(req.session.userId!);
      return res.status(200).json(conversations);
    } catch (error) {
      console.error("AI conversations error:", error);
      return res.status(500).json({ message: "Error fetching AI assistant conversations" });
    }
  });

  // Accessibility Preferences Routes
  app.get("/api/user/accessibility-preferences", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // For learners, check if they have a profile with accessibility preferences
      if (user.role === "learner") {
        const profile = await storage.getLearnerProfileByUserId(user.id);
        
        if (profile?.accessibilityPreferences) {
          return res.status(200).json(profile.accessibilityPreferences);
        }
      }
      
      // Return default preferences if none set or user is not a learner
      return res.status(200).json({
        textSize: 1, // Default size (1x)
        colorSchemeId: "default", // Default color scheme
        fontId: "default", // Default font
        reduceAnimations: false,
        highContrast: false
      });
    } catch (error) {
      console.error("Get accessibility preferences error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/user/accessibility-preferences", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { textSize, colorSchemeId, fontId, reduceAnimations, highContrast } = req.body;
      
      if (user.role === "learner") {
        const profile = await storage.getLearnerProfileByUserId(user.id);
        
        if (profile) {
          // Update existing profile
          const updatedProfile = await storage.updateLearnerProfile(profile.id, {
            accessibilityPreferences: {
              textSize,
              colorSchemeId,
              fontId,
              reduceAnimations,
              highContrast
            }
          });
          
          return res.status(200).json(updatedProfile.accessibilityPreferences);
        } else {
          // Should not happen as learners should always have a profile
          return res.status(404).json({ message: "Learner profile not found" });
        }
      } else {
        // For non-learners, we could store preferences elsewhere or return them without saving
        // For now, just return what was sent
        return res.status(200).json({
          textSize,
          colorSchemeId,
          fontId,
          reduceAnimations,
          highContrast
        });
      }
    } catch (error) {
      console.error("Update accessibility preferences error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Setup file upload middleware (for ILR file uploads)
  app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  }));
  
  // Mount new v2 API routes
  
  // Mount auth router to both paths for compatibility
  app.use("/api/auth", authRouter);
  app.use("/api/v2/auth", authRouter);
  
  // Mount email verification router to both paths for compatibility
  app.use("/api/auth/verification", emailVerificationRouter);
  app.use("/api/v2/auth/verification", emailVerificationRouter);
  
  // Mount other v2 API routes
  app.use("/api/v2/otj-logs", otjLogRouter);
  app.use("/api/v2/reviews", reviewRouter);
  app.use("/api/v2/ilr", ilrRouter);
  app.use("/api/ilr", ilrRouter); // Mount on both paths for compatibility
  app.use("/api/v2/weekly-otj", weeklyOtjRouter);
  app.use("/api/ai-assistant", aiAssistantRouter);
  
  // Course Builder API Routes
  app.get("/api/course-builder/templates", requireAuth, async (req, res) => {
    try {
      // Check if there are any query parameters
      const { standardId, creatorId } = req.query;
      const userRole = req.session?.role || '';
      const isAdmin = userRole === "admin" || userRole === "training_provider";
      let templates = [];
      
      // If specific filters are provided
      if (standardId) {
        // Get templates for a specific standard
        templates = await storage.getCourseBuilderTemplatesByStandardId(parseInt(standardId as string));
        
        // If not admin, filter to only public templates
        if (!isAdmin) {
          templates = templates.filter(template => template.isPublic);
        }
      } else if (creatorId) {
        // Get templates by creator
        templates = await storage.getCourseBuilderTemplatesByCreator(parseInt(creatorId as string));
        
        // If not admin or not the creator, filter to only public templates
        if (!isAdmin && parseInt(creatorId as string) !== req.session.userId) {
          templates = templates.filter(template => template.isPublic);
        }
      } else {
        // No specific filters, get default templates
        if (isAdmin) {
          // Get all templates created by this user + public templates
          const userTemplates = await Promise.all([
            storage.getCourseBuilderTemplatesByCreator(req.session.userId), // Get templates created by this user
            storage.getPublicCourseBuilderTemplates() // Get public templates
          ]);
          
          // Combine and remove duplicates
          templates = [...userTemplates[0], ...userTemplates[1]].filter((template, index, self) => 
            index === self.findIndex(t => t.id === template.id)
          );
        } else {
          // For regular users, just get public templates
          templates = await storage.getPublicCourseBuilderTemplates();
        }
      }
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching course builder templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });
  
  app.post("/api/course-builder/templates", requireAuth, async (req, res) => {
    try {
      // Use Zod for input validation
      const templateSchema = z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        standardId: z.number().min(1, "Standard ID is required"),
        modules: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            order: z.number(),
            ksbIds: z.array(z.number()).optional().default([]),
            lessons: z.array(
              z.object({
                id: z.string(),
                moduleId: z.string(),
                title: z.string(),
                description: z.string(),
                type: z.enum(["content", "assessment", "resource"]),
                order: z.number(),
                ksbIds: z.array(z.number()).optional().default([]),
                content: z.string().optional(),
                resourceType: z.string().optional(),
                assessmentType: z.string().optional()
              })
            ).optional().default([])
          })
        ).optional().default([]),
        isPublic: z.boolean().optional().default(false)
      });
      
      // Validate request body
      const validationResult = templateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid template data", 
          errors: validationResult.error.errors 
        });
      }
      
      const templateData = validationResult.data;
      
      // Add user ID as creator
      templateData.createdById = req.session.userId;
      
      // Sanitize data to prevent potential XSS or prompt injection
      templateData.title = templateData.title.replace(/[<>]/g, '');
      templateData.description = templateData.description.replace(/[<>]/g, '');
      
      // Sanitize module and lesson data
      templateData.modules = templateData.modules.map(module => ({
        ...module,
        title: module.title.replace(/[<>]/g, ''),
        description: module.description.replace(/[<>]/g, ''),
        lessons: module.lessons.map(lesson => ({
          ...lesson,
          title: lesson.title.replace(/[<>]/g, ''),
          description: lesson.description.replace(/[<>]/g, ''),
          content: lesson.content ? lesson.content.replace(/[<>]/g, '') : undefined
        }))
      }));
      
      const newTemplate = await storage.createCourseBuilderTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating course builder template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });
  
  app.get("/api/course-builder/templates/:id", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getCourseBuilderTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching course builder template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });
  
  app.put("/api/course-builder/templates/:id", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const templateData = req.body;
      
      // First check if template exists
      const existingTemplate = await storage.getCourseBuilderTemplate(templateId);
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      const userRole = req.session?.role || '';
      
      // Only creator or admin/training provider can update
      if (existingTemplate.createdById !== req.session.userId && 
          userRole !== "admin" && 
          userRole !== "training_provider") {
        return res.status(403).json({ message: "You don't have permission to update this template" });
      }
      
      const updatedTemplate = await storage.updateCourseBuilderTemplate(templateId, templateData);
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating course builder template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });
  
  // AI-powered course structure generation
  app.post("/api/course-builder/generate-structure", requireAuth, async (req, res) => {
    try {
      // Add role-based access check
      if (!req.session.user || !['admin', 'tutor', 'assessor', 'training_provider', 'iqa'].includes(req.session.user.role)) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
      
      // Use Zod for input validation
      const schema = z.object({
        standardId: z.number(),
        includeResources: z.boolean().optional().default(true),
        includeAssessments: z.boolean().optional().default(true),
      });
      
      // Validate request body
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { standardId, includeResources, includeAssessments } = validationResult.data;
      
      // Get the apprenticeship standard
      const standard = await storage.getApprenticeshipStandard(standardId);
      if (!standard) {
        return res.status(404).json({ message: "Apprenticeship standard not found" });
      }
      
      // Get KSBs for this standard
      const ksbs = await storage.getKsbElementsByStandard(standardId);
      
      // Sanitize standard description to prevent prompt injection
      const cleanDescription = standard.description.replace(/[\r\n]+/g, " ");
      
      // Use OpenAI to generate course structure
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const prompt = `
        Please generate a structured course for an apprenticeship program based on the following standard:
        
        Title: ${standard.title}
        Level: ${standard.level}
        Description: ${cleanDescription}
        
        Knowledge, Skills, and Behaviors to cover:
        ${ksbs.map(ksb => `- ${ksb.code}: ${ksb.description.replace(/[\r\n]+/g, " ")} (Type: ${ksb.type})`).join('\n')}
        
        Generate a comprehensive course structure with:
        1. Modules (4-8 modules)
        2. Lessons within each module (3-6 lessons per module)
        ${includeResources ? '3. Learning resources for each module' : ''}
        ${includeAssessments ? '4. Assessment activities for each module' : ''}
        
        Format your response as a JSON object with the following structure:
        {
          "modules": [
            {
              "id": "module-1",
              "title": "Module Title",
              "description": "Module description",
              "order": 1,
              "lessons": [
                {
                  "id": "lesson-1-1",
                  "moduleId": "module-1",
                  "title": "Lesson Title",
                  "description": "Lesson description",
                  "type": "content",
                  "order": 1,
                  "ksbCodes": ["K1", "S2"]
                },
                ...
              ]${includeResources ? ',\n"resources": ["Resource 1", "Resource 2", ...]' : ''}${includeAssessments ? ',\n"assessments": ["Assessment 1", "Assessment 2", ...]' : ''}
            },
            ...
          ]
        }
        
        Always respond with valid, minified JSON only — no extra explanations.
      `;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      
      // Add better error handling for missing choices
      const raw = completion.choices?.[0]?.message?.content || '{}';
      console.log("AI Course Structure Raw Output:", raw);
      
      try {
        const parsedResponse = JSON.parse(raw);
        return res.json(parsedResponse);
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        return res.status(500).json({ 
          message: "Failed to parse AI-generated course structure",
          rawResponse: raw
        });
      }
    } catch (error) {
      console.error("Error generating course structure:", error);
      res.status(500).json({ message: "Failed to generate course structure" });
    }
  });
  
  // API to generate lesson content outline based on KSBs
  app.post("/api/course-builder/generate-content", requireAuth, async (req, res) => {
    try {
      // Add role-based access check
      if (!req.session.user || !['admin', 'tutor', 'assessor', 'training_provider', 'iqa'].includes(req.session.user.role)) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
      
      // Use Zod for input validation
      const schema = z.object({
        title: z.string().min(1, "Lesson title is required"),
        description: z.string().min(1, "Lesson description is required"),
        ksbIds: z.array(z.number()).min(1, "At least one KSB must be selected"),
      });
      
      // Validate request body
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { title, description, ksbIds } = validationResult.data;
      
      // Get KSB elements
      const ksbElements = [];
      for (const ksbId of ksbIds) {
        try {
          const ksb = await storage.getKsbElement(ksbId);
          if (ksb) {
            ksbElements.push(ksb);
          }
        } catch (dbError) {
          console.error(`Error fetching KSB element with ID ${ksbId}:`, dbError);
        }
      }
      
      if (ksbElements.length === 0) {
        return res.status(404).json({ message: "No valid KSBs found for content generation" });
      }
      
      // Use OpenAI to generate content outline
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Sanitize inputs to prevent prompt injection
      const cleanTitle = title.replace(/[\r\n]+/g, " ");
      const cleanDescription = description.replace(/[\r\n]+/g, " ");
      
      const prompt = `
        Create a detailed lesson content outline for an apprenticeship course lesson with the following details:
        
        Lesson Title: ${cleanTitle}
        Lesson Description: ${cleanDescription}
        
        This lesson should address the following Knowledge, Skills, and Behaviors (KSBs):
        ${ksbElements.map(ksb => `- ${ksb.code}: ${ksb.description.replace(/[\r\n]+/g, " ")} (Type: ${ksb.type})`).join('\n')}
        
        Please generate a structured content outline that includes:
        1. Learning objectives (3-5 objectives)
        2. Key topics to cover (4-8 topics with brief descriptions)
        3. Suggested activities (2-4 practical activities)
        4. Assessment methods (how to verify understanding)
        5. Resources and references (books, websites, videos, etc.)
        
        Format your response as a JSON object with the following structure:
        {
          "learningObjectives": ["Objective 1", "Objective 2", ...],
          "topics": [
            {
              "title": "Topic 1",
              "description": "Brief description of the topic",
              "keyPoints": ["Point 1", "Point 2", ...]
            },
            ...
          ],
          "activities": [
            {
              "title": "Activity title",
              "description": "Description of the activity",
              "duration": "Estimated time (e.g., 30 minutes)"
            },
            ...
          ],
          "assessmentMethods": ["Method 1", "Method 2", ...],
          "resources": ["Resource 1", "Resource 2", ...]
        }
        
        Always respond with valid, minified JSON only — no extra explanations.
      `;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      
      // Add better error handling for missing choices
      const raw = completion.choices?.[0]?.message?.content || '{}';
      console.log("AI Lesson Content Outline Raw Output:", raw.substring(0, 500) + (raw.length > 500 ? '...(truncated)' : ''));
      
      try {
        const parsedResponse = JSON.parse(raw);
        return res.json(parsedResponse);
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        return res.status(500).json({ 
          message: "Failed to parse AI-generated content outline",
          error: parseError.message
        });
      }
    } catch (error) {
      console.error("Error generating lesson content outline:", error);
      res.status(500).json({ message: "Failed to generate lesson content outline" });
    }
  });

  // Create HTTP server
  // Routes will be registered here in future PR

  const httpServer = createServer(app);
  return httpServer;
}
