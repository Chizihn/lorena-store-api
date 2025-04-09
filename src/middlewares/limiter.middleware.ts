import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";

export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
});

// For authentication endpoints (more strict)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many requests from this user! Please try again later",
});

// For less sensitive endpoints (more lenient)
export const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: "Too many requests! Please try again later",
});

export const createLimiter = (
  maxRequests: number,
  windowMinutes: number
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: "Too many requests! Please try again later",
  });
};
