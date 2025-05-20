// Shared enums for the application

// User roles in the system
export enum UserRole {
  LEARNER = 'learner',
  ADMIN = 'admin',
  TRAINING_PROVIDER = 'training_provider',
  ASSESSOR = 'assessor',
  IQA = 'iqa',
  OPERATIONS = 'operations',
}

// User status in the system
export enum UserStatus {
  UNVERIFIED = 'unverified',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

// OTJ log status
export enum OtjLogStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// OTJ category
export enum OtjCategory {
  OTJ = 'otj',
  ENRICHMENT = 'enrichment',
}

// Review roles (for signatures)
export enum ReviewSignatureRole {
  LEARNER = 'learner',
  EMPLOYER = 'employer',
  TUTOR = 'tutor',
}

// Review status
export enum ReviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
}

// Weekly tracking status
export enum WeeklyTrackingStatus {
  PENDING = 'pending',
  COMPLETE = 'complete',
  INCOMPLETE = 'incomplete',
}