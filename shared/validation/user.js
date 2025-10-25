import { z } from 'zod';
// Basic schemas for user validation
export const emailVerificationSchema = z.object({
    id: z.number(),
    userId: z.number(),
    token: z.string(),
    expiresAt: z.date(),
    verifiedAt: z.date().nullable(),
    createdAt: z.date()
});
export const insertUserSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email format'),
    role: z.string(),
    status: z.string().default('active'),
    avatarUrl: z.string().nullable().optional()
});
export const userSchema = insertUserSchema.extend({
    id: z.number()
});
