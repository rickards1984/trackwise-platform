import { Request, Response, NextFunction } from 'express';
import { createError, ErrorCode } from './errorHandler';

/**
 * Content Security Policy (CSP) middleware
 * Protects against XSS and other code injection attacks
 */
export function setupCSP() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set Content Security Policy header
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data: https://cdn.jsdelivr.net; " +
      "connect-src 'self' https://api.example.com; " + // Customize as needed
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self'"
    );
    next();
  };
}

/**
 * Security headers middleware
 * Sets various security headers to protect against common attacks
 */
export function setupSecurityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Protect against clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Enable XSS protection in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Disable cache for sensitive pages
    if (req.path.includes('/api/auth') || req.path.includes('/api/profile')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // Strict Transport Security (HSTS)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Set permission policy
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );
    
    next();
  };
}

/**
 * Cross-Origin Resource Sharing (CORS) middleware
 * Controls which domains can access the API
 */
export function setupCORS() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Define allowed origins (customize based on your needs)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://yourapp.com'
    ];
    
    const origin = req.headers.origin;
    
    // Set CORS headers
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // Default to not allowing any cross-origin requests in production
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Access-Control-Allow-Origin', 'https://yourapp.com');
      } else {
        // In development, allow any local origin
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }
    
    // Set allowed methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Set allowed headers
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    
    // Allow credentials (cookies)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  };
}

/**
 * SQL injection protection middleware
 * Basic protection against SQL injection in query parameters
 */
export function sqlInjectionProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // List of suspicious SQL patterns
    const sqlPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
      /exec(\s|\+)+(s|x)p/i,
      /UNION(\s+)ALL(\s+)SELECT/i
    ];
    
    // Function to check for SQL injection patterns
    const checkForSQLInjection = (value: string): boolean => {
      if (!value) return false;
      
      return sqlPatterns.some(pattern => pattern.test(value));
    };
    
    // Check query parameters
    const queryParams = req.query;
    for (const param in queryParams) {
      if (typeof queryParams[param] === 'string' && 
          checkForSQLInjection(queryParams[param] as string)) {
        return next(
          createError('Invalid input detected', 400, ErrorCode.BAD_REQUEST)
        );
      }
    }
    
    // Check request body
    if (req.body && typeof req.body === 'object') {
      const checkBodyRecursively = (obj: any): boolean => {
        for (const key in obj) {
          if (typeof obj[key] === 'string' && checkForSQLInjection(obj[key])) {
            return true;
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (checkBodyRecursively(obj[key])) return true;
          }
        }
        return false;
      };
      
      if (checkBodyRecursively(req.body)) {
        return next(
          createError('Invalid input detected', 400, ErrorCode.BAD_REQUEST)
        );
      }
    }
    
    next();
  };
}

/**
 * Extract JWT token from request
 * Helper function to get the JWT token from various sources
 */
export function extractJwtToken(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check query parameters
  if (req.query && req.query.token) {
    return req.query.token as string;
  }
  
  // Check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
}

/**
 * Protection against parameter pollution
 * Prevents duplicate query parameters which can cause unexpected behavior
 */
export function parameterPollutionProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for duplicate query parameters
    const queryParams = req.query;
    const seenParams = new Set();
    
    for (const param in queryParams) {
      if (seenParams.has(param) && Array.isArray(queryParams[param])) {
        // If duplicate parameter, just keep the first value
        req.query[param] = (queryParams[param] as string[])[0];
      }
      
      seenParams.add(param);
    }
    
    next();
  };
}

/**
 * Data Sanitization Middleware
 * Sanitizes input data to prevent XSS attacks
 */
export function dataSanitization() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Function to sanitize string input
    const sanitizeString = (str: string): string => {
      return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };
    
    // Function to recursively sanitize objects
    const sanitizeObject = (obj: any): any => {
      if (!obj) return obj;
      
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      
      return obj;
    };
    
    // Sanitize query parameters
    if (req.query) {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeString(req.query[key] as string);
        }
      }
    }
    
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    next();
  };
}