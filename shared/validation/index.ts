import { z } from 'zod';
import { UserRole, UserStatus, EvidenceStatus, OtjLogStatus, OtjCategory, EvidenceType } from '../enums';

// ----- USER VALIDATION -----

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  lastLoginAt: z.date().nullable().optional(),
});

export const userCreateSchema = userSchema
  .omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true })
  .extend({
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  });

export const userUpdateSchema = userSchema
  .omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true })
  .partial()
  .extend({
    currentPassword: z.string().optional(),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
      .optional(),
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

// ----- EVIDENCE VALIDATION -----

export const evidenceSchema = z.object({
  id: z.number(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  status: z.nativeEnum(EvidenceStatus),
  learnerId: z.number(),
  assessorId: z.number().nullable().optional(),
  reviewDate: z.date().nullable().optional(),
  evidenceType: z.nativeEnum(EvidenceType),
  ksbIds: z.array(z.number()).optional(),
  feedbackText: z.string().nullable().optional(),
  feedbackProvidedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  submittedAt: z.date().nullable().optional(),
  approvedAt: z.date().nullable().optional(),
});

export const evidenceCreateSchema = evidenceSchema
  .omit({
    id: true,
    status: true,
    assessorId: true,
    reviewDate: true,
    feedbackText: true,
    feedbackProvidedAt: true,
    createdAt: true,
    updatedAt: true,
    submittedAt: true,
    approvedAt: true,
  })
  .extend({
    status: z.nativeEnum(EvidenceStatus).default(EvidenceStatus.DRAFT),
    attachments: z.array(z.any()).optional(),
  });

export const evidenceUpdateSchema = evidenceSchema
  .omit({
    id: true,
    learnerId: true,
    createdAt: true,
    updatedAt: true,
    submittedAt: true,
    approvedAt: true,
  })
  .partial()
  .extend({
    attachmentsToAdd: z.array(z.any()).optional(),
    attachmentsToRemove: z.array(z.number()).optional(),
  });

// ----- OTJ LOG VALIDATION -----

export const otjLogSchema = z.object({
  id: z.number(),
  learnerId: z.number(),
  date: z.string(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  hours: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Hours must be a decimal number with up to 2 decimal places'),
  category: z.nativeEnum(OtjCategory),
  status: z.nativeEnum(OtjLogStatus),
  ksbId: z.number().nullable().optional(),
  evidenceId: z.number().nullable().optional(),
  assessorId: z.number().nullable().optional(),
  assessorVerifiedAt: z.date().nullable().optional(),
  iqaId: z.number().nullable().optional(),
  iqaVerificationDate: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const otjLogCreateSchema = otjLogSchema
  .omit({
    id: true,
    status: true,
    assessorId: true,
    assessorVerifiedAt: true,
    iqaId: true,
    iqaVerificationDate: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: z.nativeEnum(OtjLogStatus).default(OtjLogStatus.DRAFT),
  });

export const otjLogUpdateSchema = otjLogSchema
  .omit({
    id: true,
    learnerId: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

// ----- KSB VALIDATION -----

export const ksbSchema = z.object({
  id: z.number(),
  code: z.string().min(1, 'Code is required'),
  type: z.enum(['knowledge', 'skill', 'behavior']),
  description: z.string().min(1, 'Description is required'),
  standardId: z.number(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const ksbCreateSchema = ksbSchema
  .omit({ id: true, createdAt: true, updatedAt: true });

export const ksbUpdateSchema = ksbSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

// ----- APPRENTICESHIP STANDARD VALIDATION -----

export const standardSchema = z.object({
  id: z.number(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  level: z.number().min(1).max(8),
  minimumOtjHours: z.number().min(0),
  standardCode: z.string().min(1, 'Standard code is required'),
  version: z.string().min(1, 'Version is required'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const standardCreateSchema = standardSchema
  .omit({ id: true, createdAt: true, updatedAt: true });

export const standardUpdateSchema = standardSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

// ----- LEARNER PROFILE VALIDATION -----

export const learnerProfileSchema = z.object({
  id: z.number(),
  userId: z.number(),
  standardId: z.number(),
  employerId: z.number(),
  startDate: z.string(),
  plannedEndDate: z.string(),
  actualEndDate: z.string().nullable().optional(),
  otjTargetHours: z.number().min(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const learnerProfileCreateSchema = learnerProfileSchema
  .omit({ id: true, actualEndDate: true, createdAt: true, updatedAt: true });

export const learnerProfileUpdateSchema = learnerProfileSchema
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  .partial();

// ----- REVIEW VALIDATION -----

export const reviewSchema = z.object({
  id: z.number(),
  learnerId: z.number(),
  assessorId: z.number(),
  scheduledDate: z.string(),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  type: z.string().min(1, 'Review type is required'),
  notes: z.string().optional(),
  status: z.string(),
  completedDate: z.string().nullable().optional(),
  summaryText: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const reviewCreateSchema = reviewSchema
  .omit({
    id: true,
    status: true,
    completedDate: true,
    summaryText: true,
    createdAt: true,
    updatedAt: true,
  });

export const reviewUpdateSchema = reviewSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

// ----- ILR DATA VALIDATION -----

export const ilrUploadSchema = z.object({
  id: z.number(),
  uploadedById: z.number(),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File size must be greater than 0'),
  recordCount: z.number().min(0),
  status: z.string(),
  errorMessage: z.string().nullable().optional(),
  uploadedAt: z.date().optional(),
  processedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const ilrRecordSchema = z.object({
  id: z.number(),
  uploadId: z.number(),
  learnRefNumber: z.string().min(1, 'Learner reference number is required'),
  ukprn: z.string().min(1, 'UKPRN is required'),
  aimSeqNumber: z.number().min(1),
  learnAimRef: z.string().min(1, 'Learn aim reference is required'),
  learnStartDate: z.string(),
  learnPlanEndDate: z.string(),
  fundModel: z.number(),
  progType: z.number().optional(),
  stdCode: z.string().optional(),
  otjHours: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Export types
export type User = z.infer<typeof userSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

export type Evidence = z.infer<typeof evidenceSchema>;
export type EvidenceCreate = z.infer<typeof evidenceCreateSchema>;
export type EvidenceUpdate = z.infer<typeof evidenceUpdateSchema>;

export type OtjLog = z.infer<typeof otjLogSchema>;
export type OtjLogCreate = z.infer<typeof otjLogCreateSchema>;
export type OtjLogUpdate = z.infer<typeof otjLogUpdateSchema>;

export type Ksb = z.infer<typeof ksbSchema>;
export type KsbCreate = z.infer<typeof ksbCreateSchema>;
export type KsbUpdate = z.infer<typeof ksbUpdateSchema>;

export type Standard = z.infer<typeof standardSchema>;
export type StandardCreate = z.infer<typeof standardCreateSchema>;
export type StandardUpdate = z.infer<typeof standardUpdateSchema>;

export type LearnerProfile = z.infer<typeof learnerProfileSchema>;
export type LearnerProfileCreate = z.infer<typeof learnerProfileCreateSchema>;
export type LearnerProfileUpdate = z.infer<typeof learnerProfileUpdateSchema>;

export type Review = z.infer<typeof reviewSchema>;
export type ReviewCreate = z.infer<typeof reviewCreateSchema>;
export type ReviewUpdate = z.infer<typeof reviewUpdateSchema>;

export type IlrUpload = z.infer<typeof ilrUploadSchema>;
export type IlrRecord = z.infer<typeof ilrRecordSchema>;