import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import * as schema from "../schema";

// Re-export base schemas from drizzle-zod
export const insertUserSchema = createInsertSchema(schema.users);
export const insertEvidenceItemSchema = createInsertSchema(schema.evidenceItems);
export const insertOtjLogEntrySchema = createInsertSchema(schema.otjLogEntries);

// User schemas with enhanced validation
export const registerUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username must be less than 50 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  role: z.enum(['learner', 'admin', 'training_provider', 'assessor', 'iqa', 'operations'])
    .optional()
    .default('learner'),
  avatarUrl: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password confirmation is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Email verification schemas
export const verificationTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Evidence schemas
export const evidenceSubmissionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  evidenceType: z.enum(["image", "video", "document", "project", "presentation", "other"]),
  submissionDate: z.date({
    required_error: "Submission date is required",
  }),
  status: z.enum(["draft", "submitted", "in_review", "approved", "needs_revision"]).default("draft"),
  fileUrl: z.string().url("Invalid URL").optional(),
  externalLink: z.union([
    z.string().url("Please enter a valid URL"),
    z.literal(''),
  ]).optional(),
  reflection: z.string().min(10, "Reflection must be at least 10 characters").max(1000, "Reflection must be less than 1000 characters"),
  ksbIds: z.array(z.number()).min(1, "Select at least one KSB"),
});

// URL and ID parameter schemas for route validation
export const idParamSchema = z.object({
  id: z.string().refine(val => !isNaN(parseInt(val)), {
    message: "ID must be a number"
  }),
});

export const paginationQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
});