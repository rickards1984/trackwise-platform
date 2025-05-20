import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Session data interface
export interface SessionData {
  userId: number;
  role: string;
}

// Basic authentication middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Legacy middleware alias for backward compatibility
export const isAuthenticated = requireAuth;

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.userId || !req.session.userRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }
    
    next();
  };
};

// Legacy middleware alias for backward compatibility
export const hasRole = requireRole;

// Resource ownership middleware - ensures users can only access their own resources
export const isResourceOwner = (resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const resourceId = parseInt(req.params.id);
    if (isNaN(resourceId)) {
      return res.status(400).json({ message: "Invalid resource ID" });
    }
    
    // @ts-ignore: session property added by express-session
    const session = req.session as Express.Session & {
      user?: SessionData;
    };
    
    const userId = session.userId;
    const userRole = session.role;
    
    // Admin and operations roles can access all resources
    if (userRole === 'admin' || userRole === 'operations') {
      return next();
    }
    
    try {
      let resource;
      let ownerId;
      
      // Get the appropriate resource based on type
      switch (resourceType) {
        case 'evidence':
          resource = await storage.getEvidenceItem(resourceId);
          ownerId = resource?.learnerId;
          break;
        case 'otj-log':
          resource = await storage.getOtjLogEntry(resourceId);
          ownerId = resource?.learnerId;
          break;
        case 'feedback':
          resource = await storage.getFeedbackItem(resourceId);
          ownerId = resource?.recipientId;
          break;
        case 'task':
          resource = await storage.getTask(resourceId);
          ownerId = resource?.assignedToId;
          break;
        default:
          return res.status(400).json({ message: "Invalid resource type" });
      }
      
      if (!resource) {
        return res.status(404).json({ message: `${resourceType} not found` });
      }
      
      // Check if user is the owner
      if (userId !== ownerId) {
        // For non-owners, check if they have a relationship with the resource owner
        let isAssociated = false;
        
        if (['assessor', 'training_provider', 'iqa'].includes(userRole)) {
          const learnerProfile = await storage.getLearnerProfileByUserId(ownerId);
          
          if (learnerProfile) {
            isAssociated = 
              learnerProfile.tutorId === userId || 
              learnerProfile.iqaId === userId || 
              learnerProfile.trainingProviderId === userId;
          }
        }
        
        if (!isAssociated) {
          return res.status(403).json({ message: "Forbidden - You don't have access to this resource" });
        }
      }
      
      next();
    } catch (error) {
      console.error(`Error in isResourceOwner middleware for ${resourceType}:`, error);
      return res.status(500).json({ message: "An error occurred while checking resource ownership" });
    }
  };
};

// Middleware for accessing learner profiles
export const canAccessLearnerProfile = async (req: Request, res: Response, next: NextFunction) => {
  const learnerId = parseInt(req.params.learnerId || req.params.id);
  if (isNaN(learnerId)) {
    return res.status(400).json({ message: "Invalid learner ID" });
  }
  
  // @ts-ignore: session property added by express-session
  const session = req.session as Express.Session & {
    user?: SessionData;
  };
  
  const userId = session.userId;
  const userRole = session.role;
  
  // Admin and operations roles can access all profiles
  if (userRole === 'admin' || userRole === 'operations') {
    return next();
  }
  
  // Learners can only access their own profile
  if (userRole === 'learner' && userId !== learnerId) {
    return res.status(403).json({ message: "Forbidden - You can only access your own profile" });
  }
  
  // For assessors, training providers, and IQAs, check if they're associated with the learner
  if (['assessor', 'training_provider', 'iqa'].includes(userRole)) {
    const learnerProfile = await storage.getLearnerProfileByUserId(learnerId);
    if (!learnerProfile) {
      return res.status(404).json({ message: "Learner profile not found" });
    }
    
    const isAssociated = 
      learnerProfile.tutorId === userId || 
      learnerProfile.iqaId === userId || 
      learnerProfile.trainingProviderId === userId;
      
    if (!isAssociated) {
      return res.status(403).json({ message: "Forbidden - You are not associated with this learner" });
    }
  }
  
  next();
};

// Middleware for verifying OTJ logs
export const canVerifyOtjLog = async (req: Request, res: Response, next: NextFunction) => {
  const logId = parseInt(req.params.id);
  if (isNaN(logId)) {
    return res.status(400).json({ message: "Invalid log ID" });
  }
  
  // @ts-ignore: session property added by express-session
  const session = req.session as Express.Session & {
    user?: SessionData;
  };
  
  const userId = session.userId;
  const userRole = session.role;
  
  // Only assessors, training providers, IQAs, admins, and operations can verify logs
  if (!['assessor', 'training_provider', 'iqa', 'admin', 'operations'].includes(userRole)) {
    return res.status(403).json({ message: "Forbidden - You don't have permission to verify logs" });
  }
  
  // Admin and operations roles can verify all logs
  if (userRole === 'admin' || userRole === 'operations') {
    return next();
  }
  
  // Get the log
  const log = await storage.getOtjLogEntry(logId);
  if (!log) {
    return res.status(404).json({ message: "OTJ log not found" });
  }
  
  // For assessors, training providers, and IQAs, check if they're associated with the learner
  const learnerProfile = await storage.getLearnerProfileByUserId(log.learnerId);
  if (!learnerProfile) {
    return res.status(404).json({ message: "Learner profile not found" });
  }
  
  let isAssociated = false;
  
  if (userRole === 'assessor' || userRole === 'training_provider') {
    isAssociated = 
      learnerProfile.tutorId === userId || 
      learnerProfile.trainingProviderId === userId;
  } else if (userRole === 'iqa') {
    isAssociated = learnerProfile.iqaId === userId;
  }
  
  if (!isAssociated) {
    return res.status(403).json({ message: "Forbidden - You are not associated with this learner" });
  }
  
  next();
};

// Middleware for providing feedback
export const canProvideFeedback = async (req: Request, res: Response, next: NextFunction) => {
  const recipientId = parseInt(req.body.recipientId);
  if (isNaN(recipientId)) {
    return res.status(400).json({ message: "Invalid recipient ID" });
  }
  
  // @ts-ignore: session property added by express-session
  const session = req.session as Express.Session & {
    user?: SessionData;
  };
  
  const userId = session.userId;
  const userRole = session.role;
  
  // Admin and operations roles can provide feedback to anyone
  if (userRole === 'admin' || userRole === 'operations') {
    return next();
  }
  
  // For assessors, training providers, and IQAs, check if they're associated with the recipient
  if (['assessor', 'training_provider', 'iqa'].includes(userRole)) {
    const learnerProfile = await storage.getLearnerProfileByUserId(recipientId);
    if (!learnerProfile) {
      return res.status(404).json({ message: "Recipient learner profile not found" });
    }
    
    const isAssociated = 
      learnerProfile.tutorId === userId || 
      learnerProfile.iqaId === userId || 
      learnerProfile.trainingProviderId === userId;
      
    if (!isAssociated) {
      return res.status(403).json({ message: "Forbidden - You are not associated with this learner" });
    }
  } else {
    // Other roles (e.g., learners) cannot provide feedback
    return res.status(403).json({ message: "Forbidden - You don't have permission to provide feedback" });
  }
  
  next();
};

// Middleware for accessing ILR data
export const canAccessIlrData = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore: session property added by express-session
  const session = req.session as Express.Session & {
    user?: SessionData;
  };
  
  const userRole = session.role;
  
  // Only admin, operations, and training provider can access ILR data
  if (!['admin', 'operations', 'training_provider'].includes(userRole)) {
    return res.status(403).json({ message: "Forbidden - You don't have permission to access ILR data" });
  }
  
  next();
};