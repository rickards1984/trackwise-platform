import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Generic middleware for Zod-based request validation
 * Validates request body against provided schema and handles errors uniformly
 */
export const validate = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the request body
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        // Format error messages for client consumption
        const formattedErrors = formatZodErrors(result.error);
        
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: formattedErrors
        });
      }
      
      // Replace request body with validated and transformed data
      req.body = result.data;
      next();
    } catch (error) {
      console.error("Validation middleware error:", error);
      return res.status(500).json({ 
        message: "An error occurred during validation" 
      });
    }
  };
};

/**
 * Formats Zod validation errors into a more user-friendly structure
 * Can be customized for localization or specific error message needs
 */
function formatZodErrors(error: z.ZodError) {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });
  
  return formattedErrors;
}

/**
 * Validates query parameters against provided schema
 */
export const validateQuery = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const formattedErrors = formatZodErrors(result.error);
        
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: formattedErrors
        });
      }
      
      // Replace query params with validated data
      req.query = result.data as any;
      next();
    } catch (error) {
      console.error("Query validation error:", error);
      return res.status(500).json({ 
        message: "An error occurred during query validation" 
      });
    }
  };
};

/**
 * Validates URL parameters against provided schema
 */
export const validateParams = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const formattedErrors = formatZodErrors(result.error);
        
        return res.status(400).json({ 
          message: "Invalid URL parameters", 
          errors: formattedErrors
        });
      }
      
      // Replace params with validated data
      req.params = result.data as any;
      next();
    } catch (error) {
      console.error("Params validation error:", error);
      return res.status(500).json({ 
        message: "An error occurred during URL parameter validation" 
      });
    }
  };
};