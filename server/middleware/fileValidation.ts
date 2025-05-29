import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { createError, ErrorCode } from './errorHandler';
import { fileValidationSchema, evidenceFileValidationSchema } from '../../shared/validation/fileValidation';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

/**
 * File validation middleware for general file uploads
 * Uses default file validation schema
 */
export function validateFile(req: Request, res: Response, next: NextFunction) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(createError('No file uploaded', 400, ErrorCode.BAD_REQUEST));
  }

  // Get the uploaded file
  const file = req.files.file;
  
  // Handle arrays of files (use the first one)
  const fileToValidate = Array.isArray(file) ? file[0] : file;
  
  // Extract file metadata for validation
  const fileData = {
    name: fileToValidate.name,
    size: fileToValidate.size,
    mimetype: fileToValidate.mimetype
  };

  try {
    // Validate the file using Zod schema
    fileValidationSchema.parse(fileData);
    
    // Attach the validated file to the request for use in later middleware
    req.validatedFile = fileToValidate;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * File validation middleware for evidence uploads
 * Uses evidence-specific validation schema (allows larger files)
 */
export function validateEvidenceFile(req: Request, res: Response, next: NextFunction) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(createError('No file uploaded', 400, ErrorCode.BAD_REQUEST));
  }

  // Get the uploaded file
  const file = req.files.file;
  
  // Handle arrays of files (use the first one)
  const fileToValidate = Array.isArray(file) ? file[0] : file;
  
  // Extract file metadata for validation
  const fileData = {
    name: fileToValidate.name,
    size: fileToValidate.size,
    mimetype: fileToValidate.mimetype
  };

  try {
    // Validate the file using evidence-specific Zod schema
    evidenceFileValidationSchema.parse(fileData);
    
    // Attach the validated file to the request for use in later middleware
    req.validatedFile = fileToValidate;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to save an uploaded file to the specified directory
 */
export function saveFile(uploadDir: string) {
  // Ensure the upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.validatedFile) {
      return next(createError('No validated file to save', 400, ErrorCode.BAD_REQUEST));
    }
    
    const file = req.validatedFile;
    
    // Generate a unique filename to prevent overwrites
    const timestamp = new Date().getTime();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const uniqueFileName = `${timestamp}-${safeFileName}`;
    const filePath = path.join(uploadDir, uniqueFileName);
    
    // Move the file to the upload directory
    file.mv(filePath, (err) => {
      if (err) {
        return next(createError(`Error saving file: ${err.message}`, 500, ErrorCode.INTERNAL_SERVER_ERROR));
      }
      
      // Add the file path to the request for use in route handlers
      req.savedFilePath = filePath;
      req.savedFileName = uniqueFileName;
      next();
    });
  };
}

/**
 * Middleware to handle multiple file uploads
 */
export function validateMultipleFiles(fieldNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.files) {
      return next(createError('No files uploaded', 400, ErrorCode.BAD_REQUEST));
    }
    
    const validatedFiles: any[] = [];
    
    // Validate each field
    for (const fieldName of fieldNames) {
      const files = req.files[fieldName];
      
      if (!files) {
        continue; // Skip if no files for this field
      }
      
      const fileArray = Array.isArray(files) ? files : [files];
      
      for (const file of fileArray) {
        // Extract file metadata for validation
        const fileData = {
          name: file.name,
          size: file.size,
          mimetype: file.mimetype
        };
        
        try {
          // Validate using the default schema
          fileValidationSchema.parse(fileData);
          validatedFiles.push({
            fieldName,
            file
          });
        } catch (error) {
          return next(error);
        }
      }
    }
    
    // Attach validated files to request
    req.validatedFiles = validatedFiles;
    next();
  };
}

/**
 * Middleware to save multiple files
 */
export function saveMultipleFiles(uploadDir: string) {
  // Ensure the upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.validatedFiles || req.validatedFiles.length === 0) {
      return next(createError('No validated files to save', 400, ErrorCode.BAD_REQUEST));
    }
    
    const savedFilePaths: {[key: string]: string[]} = {};
    const savedFileNames: {[key: string]: string[]} = {};
    
    try {
      // Process each validated file
      for (const { fieldName, file } of req.validatedFiles) {
        // Generate a unique filename to prevent overwrites
        const timestamp = new Date().getTime();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const uniqueFileName = `${timestamp}-${safeFileName}`;
        const filePath = path.join(uploadDir, uniqueFileName);
        
        // Ensure directory exists
        await mkdir(path.dirname(filePath), { recursive: true });
        
        // Save the file
        await new Promise<void>((resolve, reject) => {
          file.mv(filePath, (err: Error) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Initialize arrays if needed
        if (!savedFilePaths[fieldName]) {
          savedFilePaths[fieldName] = [];
          savedFileNames[fieldName] = [];
        }
        
        // Add file info to arrays
        savedFilePaths[fieldName].push(filePath);
        savedFileNames[fieldName].push(uniqueFileName);
      }
      
      // Attach saved file info to request
      req.savedFilePaths = savedFilePaths;
      req.savedFileNames = savedFileNames;
      next();
    } catch (error) {
      next(createError(`Error saving files: ${error.message}`, 500, ErrorCode.INTERNAL_SERVER_ERROR));
    }
  };
}

// Extend Express Request type to include custom properties
declare global {
  namespace Express {
    interface Request {
      validatedFile?: any;
      validatedFiles?: {fieldName: string; file: any}[];
      savedFilePath?: string;
      savedFileName?: string;
      savedFilePaths?: {[key: string]: string[]};
      savedFileNames?: {[key: string]: string[]};
    }
  }
}