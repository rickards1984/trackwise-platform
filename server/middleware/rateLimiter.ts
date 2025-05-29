import rateLimit from 'express-rate-limit';

// Configure rate limiter for AI endpoints
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    message: "Too many AI requests from this IP, please try again after 15 minutes"
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// More strict rate limiter for sensitive operations (authentication, password reset, etc.)
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    message: "Too many authentication attempts, please try again after 1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
});