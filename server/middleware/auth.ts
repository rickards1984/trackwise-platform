import { Request, Response, NextFunction } from 'express';
import { createError, ErrorCode, asyncHandler } from './errorHandler';
import { UserRole } from '../../shared/enums';
import { Session } from 'express-session';

// Extend Express-Session to include user data
declare module 'express-session' {
  interface Session {
    user?: {
      id: number;
      userId: number; // Some routes use userId instead of id
      role: UserRole;
      username: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  }
}

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: UserRole;
        username: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
    }
  }
}

/**
 * Authentication check middleware
 * Requires user to be logged in
 */
export const isAuthenticated = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user || !req.session.user.id) {
    throw createError('Unauthorized - Authentication required', 401, ErrorCode.UNAUTHORIZED);
  }

  // Attach user data to request for use in route handlers
  req.user = {
    id: req.session.user.id,
    role: req.session.user.role as UserRole,
    username: req.session.user.username,
    firstName: req.session.user.firstName,
    lastName: req.session.user.lastName,
    email: req.session.user.email
  };

  next();
});

/**
 * Role-based access control middleware
 * @param roles Array of roles that are allowed to access the route
 * @returns Middleware function
 */
export function hasRole(roles: UserRole[]) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // First ensure the user is authenticated
    if (!req.user) {
      throw createError('Unauthorized - Authentication required', 401, ErrorCode.UNAUTHORIZED);
    }

    // Check if user role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      throw createError(
        'Forbidden - You do not have permission to access this resource', 
        403, 
        ErrorCode.FORBIDDEN
      );
    }

    next();
  });
}

/**
 * Admin-only access middleware
 */
export const requireAdmin = hasRole([UserRole.ADMIN]);

/**
 * Training provider or admin access middleware
 */
export const requireTrainingProviderOrAdmin = hasRole([UserRole.ADMIN, UserRole.TRAINING_PROVIDER]);

/**
 * Assessor, training provider, or admin access middleware
 */
export const requireAssessorOrAbove = hasRole([
  UserRole.ADMIN, 
  UserRole.TRAINING_PROVIDER, 
  UserRole.ASSESSOR
]);

/**
 * Backward compatibility functions for existing code
 */
export const requireAuth = isAuthenticated;

/**
 * Backward compatibility role check
 * @param roles Array of roles as strings
 */
export function requireRole(roles: string[]) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // First ensure the user is authenticated
    if (!req.user) {
      throw createError('Unauthorized - Authentication required', 401, ErrorCode.UNAUTHORIZED);
    }

    // Convert roles to UserRole type if possible
    const userRoles = roles.map(role => {
      try {
        return role as UserRole;
      } catch (e) {
        return role;
      }
    });

    // Check if user role is in the allowed roles list
    if (!userRoles.includes(req.user.role)) {
      throw createError(
        'Forbidden - You do not have permission to access this resource', 
        403, 
        ErrorCode.FORBIDDEN
      );
    }

    next();
  });
}

/**
 * Resource ownership check middleware
 * Checks if the user owns the resource or has a role with higher permissions
 * @param resourceType The type of resource to check ownership for
 * @returns Middleware function
 */
export function isResourceOwner(resourceType: string) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createError('Unauthorized - Authentication required', 401, ErrorCode.UNAUTHORIZED);
    }

    // Admin, training provider, and assessors can access any resource
    if ([UserRole.ADMIN, UserRole.TRAINING_PROVIDER, UserRole.ASSESSOR].includes(req.user.role)) {
      return next();
    }

    const resourceId = parseInt(req.params.id);
    if (isNaN(resourceId)) {
      throw createError('Invalid resource ID', 400, ErrorCode.BAD_REQUEST);
    }

    // Switch based on resource type
    switch (resourceType) {
      case 'otj-log':
        const log = await getOtjLogById(resourceId);
        if (!log) {
          throw createError('Resource not found', 404, ErrorCode.NOT_FOUND);
        }
        if (log.learnerId === req.user.id) {
          return next();
        }
        break;
      case 'evidence':
        const evidence = await getEvidenceById(resourceId);
        if (!evidence) {
          throw createError('Resource not found', 404, ErrorCode.NOT_FOUND);
        }
        if (evidence.learnerId === req.user.id) {
          return next();
        }
        break;
      // Add more resource types as needed
      default:
        throw createError('Unknown resource type', 400, ErrorCode.BAD_REQUEST);
    }

    throw createError(
      'Forbidden - You do not have permission to access this resource', 
      403, 
      ErrorCode.FORBIDDEN
    );
  });
}

/**
 * Checks if user can access a specific learner's profile
 * Admins, training providers, and assessors can access any learner profile
 * Learners can only access their own profile
 */
export const canAccessLearnerProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw createError('Unauthorized - Authentication required', 401, ErrorCode.UNAUTHORIZED);
  }

  // Get the learner ID from the request params
  const learnerId = parseInt(req.params.id);
  
  if (isNaN(learnerId)) {
    throw createError('Invalid learner ID', 400, ErrorCode.BAD_REQUEST);
  }

  // Admin, training provider, and assessors can access any learner profile
  if ([UserRole.ADMIN, UserRole.TRAINING_PROVIDER, UserRole.ASSESSOR, UserRole.IQA].includes(req.user.role)) {
    return next();
  }

  // Learners can only access their own profile
  if (req.user.role === UserRole.LEARNER && req.user.id === learnerId) {
    return next();
  }

  // If none of the above conditions are met, deny access
  throw createError(
    'Forbidden - You do not have permission to access this learner profile', 
    403, 
    ErrorCode.FORBIDDEN
  );
});

/**
 * Check if the user can modify evidence
 * Only the owner (learner) or users with higher roles can modify evidence
 */
export const canModifyEvidence = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw createError('Unauthorized - Authentication required', 401, ErrorCode.UNAUTHORIZED);
  }

  // Admin, training provider, and assessors can modify any evidence
  if ([UserRole.ADMIN, UserRole.TRAINING_PROVIDER, UserRole.ASSESSOR, UserRole.IQA].includes(req.user.role)) {
    return next();
  }

  // Get the evidence ID from the request params
  const evidenceId = parseInt(req.params.id);
  
  if (isNaN(evidenceId)) {
    throw createError('Invalid evidence ID', 400, ErrorCode.BAD_REQUEST);
  }

  // For learners, check if the evidence belongs to them
  // This requires a database lookup, which should be implemented by the storage interface
  try {
    // This is a placeholder - actual implementation should use the storage interface
    const evidence = await getEvidenceById(evidenceId);
    
    if (!evidence) {
      throw createError('Evidence not found', 404, ErrorCode.NOT_FOUND);
    }
    
    if (evidence.learnerId === req.user.id) {
      return next();
    }
    
    throw createError(
      'Forbidden - You do not have permission to modify this evidence', 
      403, 
      ErrorCode.FORBIDDEN
    );
  } catch (error) {
    next(error);
  }
});

// Placeholder function - to be replaced with actual implementation
async function getEvidenceById(id: number) {
  // This should be replaced with an actual DB query
  return {
    id,
    learnerId: 1, // This is a placeholder
  };
}

/**
 * Check if the user can modify an OTJ log entry
 * Only the owner (learner) or users with higher roles can modify OTJ logs
 */
export const canModifyOtjLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw createError('Unauthorized - Authentication required', 401, ErrorCode.UNAUTHORIZED);
  }

  // Admin, training provider, and assessors can modify any OTJ log
  if ([UserRole.ADMIN, UserRole.TRAINING_PROVIDER, UserRole.ASSESSOR, UserRole.IQA].includes(req.user.role)) {
    return next();
  }

  // Get the OTJ log ID from the request params
  const logId = parseInt(req.params.id);
  
  if (isNaN(logId)) {
    throw createError('Invalid OTJ log ID', 400, ErrorCode.BAD_REQUEST);
  }

  // For learners, check if the OTJ log belongs to them
  // This requires a database lookup, which should be implemented by the storage interface
  try {
    // This is a placeholder - actual implementation should use the storage interface
    const log = await getOtjLogById(logId);
    
    if (!log) {
      throw createError('OTJ log not found', 404, ErrorCode.NOT_FOUND);
    }
    
    if (log.learnerId === req.user.id) {
      return next();
    }
    
    throw createError(
      'Forbidden - You do not have permission to modify this OTJ log', 
      403, 
      ErrorCode.FORBIDDEN
    );
  } catch (error) {
    next(error);
  }
});

/**
 * Check if the user can verify an OTJ log entry
 * Only assessors, training providers, and admins can verify OTJ logs
 */
export const canVerifyOtjLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw createError('Unauthorized - Authentication required', 401, ErrorCode.UNAUTHORIZED);
  }

  // Only assessors, training providers, and admins can verify logs
  if ([UserRole.ADMIN, UserRole.TRAINING_PROVIDER, UserRole.ASSESSOR].includes(req.user.role)) {
    return next();
  }
  
  throw createError(
    'Forbidden - You do not have permission to verify OTJ logs',
    403,
    ErrorCode.FORBIDDEN
  );
});

// Placeholder function - to be replaced with actual implementation
async function getOtjLogById(id: number) {
  // This should be replaced with an actual DB query
  return {
    id,
    learnerId: 1, // This is a placeholder
  };
}

/**
 * Rate limiting middleware for sensitive operations
 * Simple rate limiting based on user ID
 */
const rateLimitMap = new Map<number, { count: number, resetTime: number }>();

export function rateLimit(maxRequests: number = 30, windowMs: number = 60 * 1000) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createError('Unauthorized - Authentication required', 401, ErrorCode.UNAUTHORIZED);
    }

    const userId = req.user.id;
    const now = Date.now();
    
    // Get or create rate limit entry for this user
    let limitData = rateLimitMap.get(userId);
    
    if (!limitData || now > limitData.resetTime) {
      limitData = { count: 0, resetTime: now + windowMs };
      rateLimitMap.set(userId, limitData);
    }
    
    // Increment request count
    limitData.count++;
    
    // Check if rate limit is exceeded
    if (limitData.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((limitData.resetTime - now) / 1000);
      
      res.set('Retry-After', String(retryAfterSeconds));
      throw createError(
        `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds`, 
        429, 
        ErrorCode.TOO_MANY_REQUESTS
      );
    }
    
    next();
  });
}