import { z } from 'zod';

// Allowed file types for general uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
];

// Additional allowed file types for evidence
const ADDITIONAL_EVIDENCE_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
];

// Maximum file size for general uploads (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024; 

// Maximum file size for evidence uploads (20MB)
const MAX_EVIDENCE_FILE_SIZE = 20 * 1024 * 1024;

// File name validation pattern
const VALID_FILENAME_PATTERN = /^[a-zA-Z0-9_\-., ]+\.[a-zA-Z0-9]+$/;

/**
 * Base file validation schema for general uploads
 */
export const fileValidationSchema = z.object({
  name: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name is too long')
    .refine(name => VALID_FILENAME_PATTERN.test(name), {
      message: 'File name contains invalid characters',
    }),
  size: z.number()
    .min(1, 'File cannot be empty')
    .max(MAX_FILE_SIZE, 'File size exceeds the maximum allowed (5MB)'),
  mimetype: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid file type. Supported formats include PDF, Office documents, images, and text files.' }),
  }),
});

/**
 * Extended file validation schema for evidence uploads
 * Allows larger file sizes and additional file types
 */
export const evidenceFileValidationSchema = z.object({
  name: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name is too long')
    .refine(name => VALID_FILENAME_PATTERN.test(name), {
      message: 'File name contains invalid characters',
    }),
  size: z.number()
    .min(1, 'File cannot be empty')
    .max(MAX_EVIDENCE_FILE_SIZE, 'File size exceeds the maximum allowed (20MB)'),
  mimetype: z.string().refine(
    mime => [...ALLOWED_MIME_TYPES, ...ADDITIONAL_EVIDENCE_MIME_TYPES].includes(mime),
    {
      message: 'Invalid file type. Supported formats include PDF, Office documents, images, videos, audio files, and compressed archives.',
    }
  ),
});

/**
 * Evidence attachment validation schema
 * For validating existing files in the database
 */
export const evidenceAttachmentSchema = z.object({
  id: z.number().optional(),
  evidenceId: z.number(),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File size must be greater than 0'),
  fileType: z.string().min(1, 'File type is required'),
  filePath: z.string().min(1, 'File path is required'),
  uploadedAt: z.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

/**
 * Multi-file upload validation schema
 */
export const multiFileUploadSchema = z.object({
  files: z.array(fileValidationSchema).min(1, 'At least one file must be uploaded'),
  maxFiles: z.number().min(1).default(5),
}).refine(
  data => data.files.length <= data.maxFiles,
  {
    message: `Maximum number of files exceeded`,
    path: ['files'],
  }
);

export type FileValidation = z.infer<typeof fileValidationSchema>;
export type EvidenceFileValidation = z.infer<typeof evidenceFileValidationSchema>;
export type EvidenceAttachment = z.infer<typeof evidenceAttachmentSchema>;
export type MultiFileUpload = z.infer<typeof multiFileUploadSchema>;