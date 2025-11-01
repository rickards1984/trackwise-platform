// @ts-nocheck
import { UserRole } from './enums';

// Define session user interface
export interface SessionUser {
  userId: number;
  role: string;
  username?: string;
}

// Extend the Express Session interface
declare module 'express-session' {
  interface SessionData {
    userId: number;
    role: UserRole;
  }
}