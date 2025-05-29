/**
 * User role enum for type-safe role checking
 */
export enum UserRole {
  ADMIN = 'admin',
  TRAINING_PROVIDER = 'training_provider',
  ASSESSOR = 'assessor',
  IQA = 'iqa',
  LEARNER = 'learner',
  OPERATIONS = 'operations'
}

/**
 * User status enum for type-safe status checking
 */
export enum UserStatus {
  UNVERIFIED = 'unverified',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated'
}

/**
 * Evidence status enum for type-safe status checking
 */
export enum EvidenceStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  NEEDS_REVISION = 'needs_revision'
}

/**
 * OTJ log status enum for type-safe status checking
 */
export enum OtjLogStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

/**
 * ILR upload status enum for type-safe status checking
 */
export enum IlrUploadStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * OTJ category enum for type-safe category checking
 */
export enum OtjCategory {
  OTJ = 'otj',
  ENRICHMENT = 'enrichment'
}

/**
 * Weekly tracking status enum for type-safe status checking
 */
export enum WeeklyTrackingStatus {
  PENDING = 'pending',
  COMPLETE = 'complete',
  INCOMPLETE = 'incomplete'
}

/**
 * Evidence type enum for type-safe type checking
 */
export enum EvidenceType {
  DOCUMENT = 'document',
  PROJECT = 'project',
  IMAGE = 'image',
  VIDEO = 'video',
  PRESENTATION = 'presentation',
  OTHER = 'other'
}

/**
 * Review status enum for type-safe status checking
 */
export enum ReviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled'
}