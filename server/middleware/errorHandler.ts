import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Error codes for consistent client-side handling
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INVALID_FILE = 'INVALID_FILE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS'
}

// Custom error class with code for client-side error handling
export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  data?: any;
  
  constructor(message: string, statusCode: number, code: ErrorCode, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper function to create standardized error responses
export function createError(
  message: string, 
  statusCode: number = 500, 
  code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
  data?: any
): AppError {
  return new AppError(message, statusCode, code, data);
}

// Sanitize error message for production to avoid exposing sensitive details
function sanitizeErrorMessage(err: Error): string {
  // In production, return generic message unless it's a custom AppError
  if (process.env.NODE_ENV === 'production' && !(err instanceof AppError)) {
    return 'An error occurred';
  }
  
  return err.message;
}

// Format Zod validation errors
function formatZodError(error: ZodError) {
  return {
    code: ErrorCode.VALIDATION_ERROR,
    message: 'Validation error',
    errors: error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }))
  };
}

// Global error handling middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Default to 500 internal server error
  let statusCode = 500;
  let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let errorMessage = 'Internal server error';
  let errorData = undefined;
  
  // Handle specific error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    errorMessage = err.message;
    errorData = err.data;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    const formattedError = formatZodError(err);
    errorCode = formattedError.code;
    errorMessage = formattedError.message;
    errorData = formattedError.errors;
  } else if (err.type === 'entity.too.large') {
    // Express file size error
    statusCode = 413;
    errorCode = ErrorCode.FILE_TOO_LARGE;
    errorMessage = 'File too large';
  } else {
    // Generic error, sanitize message in production
    errorMessage = sanitizeErrorMessage(err);
  }
  
  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }
  
  // Send standardized error response
  res.status(statusCode).json({
    success: false,
    code: errorCode,
    message: errorMessage,
    ...(errorData ? { errors: errorData } : {})
  });
}

// Async error wrapper to avoid try/catch blocks in route handlers
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Not found error handler middleware
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const err = createError(`Route not found: ${req.originalUrl}`, 404, ErrorCode.NOT_FOUND);
  next(err);
}