import { pgTable, text, serial, integer, boolean, date, timestamp, pgEnum, varchar, jsonb, decimal, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
// Enum for user roles
export const userRoleEnum = pgEnum('user_role', ['admin', 'training_provider', 'assessor', 'iqa', 'learner', 'operations']);
// Enum for user status
export const userStatusEnum = pgEnum('user_status', ['unverified', 'pending_approval', 'active', 'suspended', 'deactivated']);
// Enum for evidence status
export const evidenceStatusEnum = pgEnum('evidence_status', ['draft', 'submitted', 'in_review', 'approved', 'needs_revision']);
// Enum for OTJ log status
export const otjLogStatusEnum = pgEnum('otj_log_status', ['draft', 'submitted', 'approved', 'rejected']);
// Enum for ILR upload status
export const ilrUploadStatusEnum = pgEnum('ilr_upload_status', ['pending', 'validating', 'processing', 'complete', 'error']);
// Enum for OTJ category
export const otjCategoryEnum = pgEnum('otj_category', ['otj', 'enrichment']);
// Enum for weekly tracking status
export const weeklyTrackingStatusEnum = pgEnum('weekly_tracking_status', ['pending', 'complete', 'incomplete']);
// Enum for evidence type
export const evidenceTypeEnum = pgEnum('evidence_type', ['document', 'project', 'image', 'video', 'presentation', 'other']);
// Users table
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull().unique(),
    role: userRoleEnum("role").notNull().default('learner'),
    status: userStatusEnum("status").notNull().default('unverified'),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
    gdprConsentGiven: boolean("gdpr_consent_given").default(false),
    gdprConsentDate: timestamp("gdpr_consent_date"),
    dataRetentionAccepted: boolean("data_retention_accepted").default(false),
    marketingOptIn: boolean("marketing_opt_in").default(false),
});
// Email verification table
export const emailVerifications = pgTable("email_verifications", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    verified: boolean("verified").notNull().default(false),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow(),
});
// KSB elements table (Knowledge, Skills, Behaviors)
export const ksbElements = pgTable("ksb_elements", {
    id: serial("id").primaryKey(),
    type: text("type").notNull(), // 'knowledge', 'skill', 'behavior'
    code: text("code").notNull(), // E.g. 'K1', 'S2', 'B3'
    description: text("description").notNull(),
    standardId: integer("standard_id").notNull(), // Foreign key to apprenticeship standards
});
// Apprenticeship Standards
export const apprenticeshipStandards = pgTable("apprenticeship_standards", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    level: integer("level").notNull(),
    description: text("description").notNull(),
    minimumOtjHours: integer("minimum_otj_hours").notNull(),
});
// Learner Profiles
export const learnerProfiles = pgTable("learner_profiles", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(), // Foreign key to users
    standardId: integer("standard_id").notNull(), // Foreign key to apprenticeship standards
    startDate: date("start_date").notNull(),
    expectedEndDate: date("expected_end_date").notNull(),
    tutorId: integer("tutor_id"), // Foreign key to users (with role assessor)
    iqaId: integer("iqa_id"), // Foreign key to users (with role iqa)
    trainingProviderId: integer("training_provider_id"), // Foreign key to users (with role training_provider)
    accessibilityPreferences: jsonb("accessibility_preferences"), // User accessibility settings
});
// Evidence Collection
export const evidenceItems = pgTable("evidence_items", {
    id: serial("id").primaryKey(),
    learnerId: integer("learner_id").notNull(), // Foreign key to users
    title: text("title").notNull(),
    description: text("description").notNull(),
    evidenceType: evidenceTypeEnum("evidence_type").notNull(),
    fileUrl: text("file_url"),
    externalLink: text("external_link"),
    reflection: text("reflection"),
    submissionDate: timestamp("submission_date").notNull(),
    status: evidenceStatusEnum("status").notNull().default('draft'),
    feedbackId: integer("feedback_id"), // Foreign key to feedback items
    // File metadata fields
    originalFilename: text("original_filename"),
    mimetype: text("mimetype"),
    filesize: integer("filesize"),
    // Review process tracking
    reviewStartDate: timestamp("review_start_date"),
    approvedDate: timestamp("approved_date"),
});
// Evidence to KSB mapping
export const evidenceKsbMapping = pgTable("evidence_ksb_mapping", {
    id: serial("id").primaryKey(),
    evidenceId: integer("evidence_id").notNull(), // Foreign key to evidence items
    ksbId: integer("ksb_id").notNull(), // Foreign key to ksb elements
});
// OTJ Log Entries
export const otjLogEntries = pgTable("otj_log_entries", {
    id: serial("id").primaryKey(),
    learnerId: integer("learner_id").notNull(), // Foreign key to users
    date: date("date").notNull(),
    hours: decimal("hours", { precision: 5, scale: 2 }).notNull(), // Store hours with precision (999.99)
    activityType: text("activity_type").notNull(),
    description: text("description").notNull(), // Description field
    category: otjCategoryEnum("category").notNull(),
    ksbId: integer("ksb_id"), // Foreign key to ksb elements, optional
    evidenceId: integer("evidence_id"), // Foreign key to evidence items, optional
    status: otjLogStatusEnum("status").notNull().default('draft'),
    verifierId: integer("verifier_id"), // Foreign key to users, who verified this entry
    verificationDate: timestamp("verification_date"),
    iqaVerifierId: integer("iqa_verifier_id"), // Foreign key to users, who verified this entry as IQA
    iqaVerificationDate: timestamp("iqa_verification_date"),
});
// Feedback Items
export const feedbackItems = pgTable("feedback_items", {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id").notNull(), // Foreign key to users
    recipientId: integer("recipient_id").notNull(), // Foreign key to users
    message: text("message").notNull(),
    date: timestamp("date").notNull(),
    relatedItemType: text("related_item_type").notNull(), // 'evidence', 'otj_log', etc.
    relatedItemId: integer("related_item_id").notNull(),
});
// Tasks/Assignments
export const tasks = pgTable("tasks", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    dueDate: date("due_date").notNull(),
    assignedById: integer("assigned_by_id").notNull(), // Foreign key to users
    assignedToId: integer("assigned_to_id").notNull(), // Foreign key to users
    status: text("status").notNull(), // 'pending', 'completed', 'overdue'
    ksbId: integer("ksb_id"), // Foreign key to ksb elements, optional
});
// Learning Goals
export const learningGoals = pgTable("learning_goals", {
    id: serial("id").primaryKey(),
    learnerId: integer("learner_id").notNull(), // Foreign key to users
    tutorId: integer("tutor_id").notNull(), // Foreign key to users (tutor/assessor)
    title: text("title").notNull(),
    description: text("description").notNull(),
    targetDate: date("target_date").notNull(),
    status: text("status").notNull().default('active'), // 'active', 'completed', 'overdue'
    completionDate: date("completion_date"),
    ksbIds: integer("ksb_ids").array(), // Array of KSB element IDs this goal is related to
    createdAt: timestamp("created_at").defaultNow(),
});
// AI Assistant Configuration
export const aiAssistantConfig = pgTable("ai_assistant_config", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().unique(), // Foreign key to users
    enabled: boolean("enabled").notNull().default(true),
    reminderFrequency: text("reminder_frequency").notNull().default('weekly'), // 'daily', 'weekly', 'monthly'
    reminderChannels: text("reminder_channels").array().notNull().default(['email']), // ['email', 'whatsapp', 'in_app']
    lastInteractionDate: timestamp("last_interaction_date"),
    personalizedSettings: jsonb("personalized_settings"), // Customizable settings for each user
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// AI Assistant Conversations
export const aiAssistantConversations = pgTable("ai_assistant_conversations", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(), // Foreign key to users
    message: text("message").notNull(),
    response: text("response"),
    metadata: jsonb("metadata"), // Additional data like related KSBs, sentiment, etc.
    createdAt: timestamp("created_at").defaultNow(),
});
// Learning Resources
export const learningResources = pgTable("learning_resources", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    resourceType: text("resource_type").notNull(), // 'article', 'video', 'document', 'link'
    contentUrl: text("content_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    tags: text("tags").array(),
    standardId: integer("standard_id"), // Related apprenticeship standard (optional)
    ksbIds: integer("ksb_ids").array(), // Array of KSB element IDs this resource helps with
    createdById: integer("created_by_id").notNull(), // User who added this resource
    createdAt: timestamp("created_at").defaultNow(),
});
// Provider Settings
export const providerSettings = pgTable("provider_settings", {
    id: serial("id").primaryKey(),
    providerName: text("provider_name").notNull(),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color").default('#4f46e5'), // Default color
    secondaryColor: text("secondary_color").default('#6366f1'),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    websiteUrl: text("website_url"),
    lastUpdatedBy: integer("last_updated_by").notNull(), // User ID who last updated settings
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Course Builder Templates
export const courseBuilderTemplates = pgTable("course_builder_templates", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    structure: jsonb("structure").notNull(), // JSON structure of the template
    standardId: integer("standard_id"), // Related standard or null if generic
    createdById: integer("created_by_id").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// ILR File Uploads
export const ilrFileUploads = pgTable("ilr_file_uploads", {
    id: serial("id").primaryKey(),
    filename: text("filename").notNull(),
    fileUrl: text("file_url").notNull(),
    uploadDate: timestamp("upload_date").defaultNow(),
    uploadedById: integer("uploaded_by_id").notNull(), // User who uploaded the file
    status: ilrUploadStatusEnum("status").notNull().default('pending'),
    errorDetails: text("error_details"), // Error message if processing failed
    validationReport: jsonb("validation_report"), // JSON report of validation results
    fileSize: integer("file_size").notNull(), // Size in bytes
    academicYear: text("academic_year").notNull(), // e.g., "2024-25"
    returnPeriod: integer("return_period").notNull(), // ILR return period (1-14)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// ILR Learner Records - storing extracted learner data from ILR files
export const ilrLearnerRecords = pgTable("ilr_learner_records", {
    id: serial("id").primaryKey(),
    ilrFileId: integer("ilr_file_id").notNull(), // Foreign key to ilr_file_uploads
    learnerId: integer("learner_id"), // Optional link to internal learner profile
    learnRefNumber: text("learn_ref_number").notNull(), // Unique learner reference number
    ukprn: text("ukprn").notNull(), // UK Provider Reference Number
    uln: text("uln").notNull(), // Unique Learner Number
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    learningAimReference: text("learning_aim_reference").notNull(), // Standard code
    learningStartDate: date("learning_start_date").notNull(),
    learningPlannedEndDate: date("learning_planned_end_date").notNull(),
    fundingModel: integer("funding_model").notNull(), // e.g., 36 for apprenticeships
    completionStatus: integer("completion_status").notNull(), // 1=continuing, 2=completed, etc.
    priorAttainment: integer("prior_attainment"), // Prior educational attainment
    postcode: text("postcode").notNull(),
    rawData: jsonb("raw_data"), // Full learner record JSON data
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// ILR Validation Rules
export const ilrValidationRules = pgTable("ilr_validation_rules", {
    id: serial("id").primaryKey(),
    ruleId: text("rule_id").notNull().unique(), // e.g., "R01", "DateOfBirth_01"
    description: text("description").notNull(),
    category: text("category").notNull(), // "Error", "Warning"
    fieldName: text("field_name").notNull(), // The field this rule validates
    validationLogic: text("validation_logic").notNull(), // Description of the validation logic
    errorMessage: text("error_message").notNull(),
    academicYear: text("academic_year").notNull(), // Which academic year this rule applies to
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// ILR Validation Results - specific validation issues found in a file
export const ilrValidationResults = pgTable("ilr_validation_results", {
    id: serial("id").primaryKey(),
    ilrFileId: integer("ilr_file_id").notNull(), // Foreign key to ilr_file_uploads
    ruleId: text("rule_id").notNull(), // Foreign key to ilr_validation_rules
    learnRefNumber: text("learn_ref_number"), // For learner-specific issues
    severity: text("severity").notNull(), // "Error", "Warning"
    message: text("message").notNull(),
    details: jsonb("details"), // Additional details about the issue
    recordNumber: integer("record_number"), // Line/record number in the file
    createdAt: timestamp("created_at").defaultNow(),
});
// Session storage table for authentication
export const sessions = pgTable("sessions", {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
}, (table) => {
    return {
        expireIdx: index("session_expire_idx").on(table.expire)
    };
});
// Weekly OTJ Hours Tracking
export const weeklyOtjTracking = pgTable("weekly_otj_tracking", {
    id: serial("id").primaryKey(),
    learnerId: integer("learner_id").notNull(), // Foreign key to users
    weekStartDate: date("week_start_date").notNull(), // Monday of the week
    weekEndDate: date("week_end_date").notNull(), // Sunday of the week
    totalHours: decimal("total_hours", { precision: 5, scale: 2 }).notNull().default("0"), // Total OTJ hours with precision (999.99)
    minimumRequiredHours: decimal("minimum_required_hours", { precision: 5, scale: 2 }).notNull().default("6"), // Default minimum 6 hours
    status: weeklyTrackingStatusEnum("status").notNull().default('pending'), // Whether minimum hours were achieved
    metRequirement: boolean("met_requirement").notNull().default(false), // Whether minimum hours were achieved
    notes: text("notes"), // Any notes about this week's hours
    tutorId: integer("tutor_id"), // Tutor who reviewed the weekly tracking
    tutorReviewDate: timestamp("tutor_review_date"), // When the tutor reviewed
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Enum for review status
export const reviewStatusEnum = pgEnum('review_status', ['scheduled', 'completed', 'cancelled', 'rescheduled']);
// 12-Weekly Reviews
export const twelveWeeklyReviews = pgTable("twelve_weekly_reviews", {
    id: serial("id").primaryKey(),
    learnerId: integer("learner_id").notNull(), // Foreign key to users
    tutorId: integer("tutor_id").notNull(), // Tutor/assessor who will conduct the review
    employerId: integer("employer_id"), // Employer representative (optional)
    reviewType: text("review_type").notNull().default('12-weekly'), // Type of review: '12-weekly', 'gateway', 'initial'
    reviewNumber: integer("review_number").notNull(), // Which review this is (1st, 2nd, 3rd, etc.)
    scheduledDate: timestamp("scheduled_date").notNull(), // When the review is scheduled
    actualDate: timestamp("actual_date"), // When the review actually happened
    location: text("location"), // Physical or virtual location of the meeting
    status: reviewStatusEnum("status").notNull().default('scheduled'),
    summaryNotes: text("summary_notes"), // Summary of the review meeting
    progressAssessment: text("progress_assessment"), // Assessment of learner's progress
    concerns: text("concerns"), // Any concerns raised during the review
    actionItems: jsonb("action_items"), // Action items agreed during the review
    otjHoursSummary: jsonb("otj_hours_summary"), // Summary of OTJ hours for the period
    evidenceSummary: jsonb("evidence_summary"), // Summary of evidence collected for the period
    learnerFeedback: text("learner_feedback"), // Feedback from the learner
    employerFeedback: text("employer_feedback"), // Feedback from the employer
    tutorFeedback: text("tutor_feedback"), // Feedback from the tutor/assessor
    signedByLearner: boolean("signed_by_learner").notNull().default(false),
    signedByEmployer: boolean("signed_by_employer").notNull().default(false),
    signedByTutor: boolean("signed_by_tutor").notNull().default(false),
    learnerSignatureDate: timestamp("learner_signature_date"),
    employerSignatureDate: timestamp("employer_signature_date"),
    tutorSignatureDate: timestamp("tutor_signature_date"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Helper to create Zod schema from PG enum values
export function createZodEnumFromPgEnum(pgEnum) {
    if (pgEnum.enumValues.length === 0) {
        throw new Error('Enum must have at least one value');
    }
    // Create a properly typed tuple with at least one value
    const [first, ...rest] = pgEnum.enumValues;
    return z.enum([first, ...rest]);
}
// Zod schemas for all the enums
export const userRoleSchema = createZodEnumFromPgEnum(userRoleEnum);
export const userStatusSchema = createZodEnumFromPgEnum(userStatusEnum);
export const evidenceStatusSchema = createZodEnumFromPgEnum(evidenceStatusEnum);
export const otjLogStatusSchema = createZodEnumFromPgEnum(otjLogStatusEnum);
export const ilrUploadStatusSchema = createZodEnumFromPgEnum(ilrUploadStatusEnum);
export const otjCategorySchema = createZodEnumFromPgEnum(otjCategoryEnum);
export const weeklyTrackingStatusSchema = createZodEnumFromPgEnum(weeklyTrackingStatusEnum);
export const evidenceTypeSchema = createZodEnumFromPgEnum(evidenceTypeEnum);
export const reviewStatusSchema = createZodEnumFromPgEnum(reviewStatusEnum);
// Create insert schemas
export const insertUserSchema = createInsertSchema(users, {
    role: userRoleSchema,
    status: userStatusSchema
}).omit({
    id: true,
    createdAt: true,
    lastLoginAt: true,
});
export const insertEmailVerificationSchema = createInsertSchema(emailVerifications).omit({
    id: true,
    createdAt: true,
    verifiedAt: true,
});
export const updateEmailVerificationSchema = createInsertSchema(emailVerifications)
    .omit({
    id: true,
    userId: true,
    email: true,
    createdAt: true,
})
    .partial();
export const insertTwelveWeeklyReviewSchema = createInsertSchema(twelveWeeklyReviews).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    learnerSignatureDate: true,
    employerSignatureDate: true,
    tutorSignatureDate: true,
});
export const insertKsbElementSchema = createInsertSchema(ksbElements).omit({
    id: true,
});
export const insertApprenticeshipStandardSchema = createInsertSchema(apprenticeshipStandards).omit({
    id: true,
});
export const insertLearnerProfileSchema = createInsertSchema(learnerProfiles).omit({
    id: true,
});
export const insertEvidenceItemSchema = createInsertSchema(evidenceItems).omit({
    id: true,
    feedbackId: true,
});
export const insertEvidenceKsbMappingSchema = createInsertSchema(evidenceKsbMapping).omit({
    id: true,
});
export const insertOtjLogEntrySchema = createInsertSchema(otjLogEntries).omit({
    id: true,
    verifierId: true,
    verificationDate: true,
    iqaVerifierId: true,
    iqaVerificationDate: true,
});
export const insertFeedbackItemSchema = createInsertSchema(feedbackItems).omit({
    id: true,
});
export const insertTaskSchema = createInsertSchema(tasks).omit({
    id: true,
});
export const insertLearningGoalSchema = createInsertSchema(learningGoals).omit({
    id: true,
    createdAt: true,
});
export const insertAiAssistantConfigSchema = createInsertSchema(aiAssistantConfig).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
export const insertAiAssistantConversationSchema = createInsertSchema(aiAssistantConversations).omit({
    id: true,
    createdAt: true,
});
export const insertLearningResourceSchema = createInsertSchema(learningResources).omit({
    id: true,
    createdAt: true,
});
export const insertProviderSettingsSchema = createInsertSchema(providerSettings).omit({
    id: true,
    updatedAt: true,
});
export const insertCourseBuilderTemplateSchema = createInsertSchema(courseBuilderTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
export const insertWeeklyOtjTrackingSchema = createInsertSchema(weeklyOtjTracking).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    tutorReviewDate: true,
});
// ILR schemas
export const insertIlrFileUploadSchema = createInsertSchema(ilrFileUploads).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    status: true,
    validationReport: true,
    errorDetails: true,
});
export const insertIlrLearnerRecordSchema = createInsertSchema(ilrLearnerRecords).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
export const insertIlrValidationRuleSchema = createInsertSchema(ilrValidationRules).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
export const insertIlrValidationResultSchema = createInsertSchema(ilrValidationResults).omit({
    id: true,
    createdAt: true,
});
