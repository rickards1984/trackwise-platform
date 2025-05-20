import { randomBytes } from 'crypto';

/**
 * Generate a secure random token for email verification
 * @returns verification token string
 */
export function generateToken(): string {
  // Generate a 32-byte random token and convert to hex
  return randomBytes(32).toString('hex');
}

/**
 * Generate verification URL based on token
 * @param token verification token
 * @returns full verification URL
 */
export function generateVerificationUrl(token: string): string {
  // Use environment-aware domain construction
  const baseUrl = process.env.BASE_URL || `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;
  return `${baseUrl}/auth/verify-email?token=${token}`;
}

/**
 * Verify if a token is valid and not expired
 * @param token verification token
 * @param createdAt when the token was created
 * @param expiresAt when the token expires
 * @returns boolean indicating if token is valid
 */
export function isTokenValid(token: string, createdAt: Date, expiresAt: Date): boolean {
  if (!token) return false;
  
  const now = new Date();
  return now <= expiresAt;
}