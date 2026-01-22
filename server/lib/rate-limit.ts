import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';

// In-memory store for tracking abuse (in production, use Redis)
interface AbuseTracker {
  ip: Map<string, { count: number; firstSeen: number; blocked: boolean }>;
  user: Map<string, { count: number; firstSeen: number; blocked: boolean }>;
}

const abuseTracker: AbuseTracker = {
  ip: new Map(),
  user: new Map(),
};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, value] of abuseTracker.ip.entries()) {
    if (now - value.firstSeen > oneHour) {
      abuseTracker.ip.delete(key);
    }
  }
  
  for (const [key, value] of abuseTracker.user.entries()) {
    if (now - value.firstSeen > oneHour) {
      abuseTracker.user.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Get user identifier from request
 */
function getUserId(req: Request): string | null {
  return (req.headers['x-privy-user-id'] as string) || null;
}

// Abuse thresholds
const ABUSE_THRESHOLD_COUNT = 50; // Block after 50 failed requests
const ABUSE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Track failed requests for abuse detection
 */
export function trackFailedRequest(req: Request, reason: string) {
  const ip = getClientIp(req);
  const userId = getUserId(req);
  const now = Date.now();
  
  // Track by IP
  const ipEntry = abuseTracker.ip.get(ip) || { count: 0, firstSeen: now, blocked: false };
  
  // Reset count if window has passed
  if (now - ipEntry.firstSeen > ABUSE_WINDOW_MS) {
    ipEntry.count = 0;
    ipEntry.firstSeen = now;
  }
  
  ipEntry.count += 1;
  abuseTracker.ip.set(ip, ipEntry);
  
  // Auto-block if threshold exceeded
  if (ipEntry.count >= ABUSE_THRESHOLD_COUNT && !ipEntry.blocked) {
    ipEntry.blocked = true;
    console.warn(`🚫 Auto-blocked IP ${ip} after ${ipEntry.count} failed requests`);
  }
  
  // Track by user if available
  if (userId) {
    const userEntry = abuseTracker.user.get(userId) || { count: 0, firstSeen: now, blocked: false };
    
    // Reset count if window has passed
    if (now - userEntry.firstSeen > ABUSE_WINDOW_MS) {
      userEntry.count = 0;
      userEntry.firstSeen = now;
    }
    
    userEntry.count += 1;
    abuseTracker.user.set(userId, userEntry);
    
    // Auto-block if threshold exceeded
    if (userEntry.count >= ABUSE_THRESHOLD_COUNT && !userEntry.blocked) {
      userEntry.blocked = true;
      console.warn(`🚫 Auto-blocked user ${userId} after ${userEntry.count} failed requests`);
    }
  }
}

/**
 * Check if IP or user is blocked
 */
export function isBlocked(req: Request): { blocked: boolean; reason?: string } {
  const ip = getClientIp(req);
  const userId = getUserId(req);
  
  // Check IP block
  const ipEntry = abuseTracker.ip.get(ip);
  if (ipEntry?.blocked) {
    return { blocked: true, reason: 'IP address is blocked due to abuse' };
  }
  
  // Check user block
  if (userId) {
    const userEntry = abuseTracker.user.get(userId);
    if (userEntry?.blocked) {
      return { blocked: true, reason: 'User account is blocked due to abuse' };
    }
  }
  
  return { blocked: false };
}

/**
 * Block an IP or user
 */
export function blockClient(req: Request, durationMs: number = 60 * 60 * 1000) {
  const ip = getClientIp(req);
  const userId = getUserId(req);
  
  const ipEntry = abuseTracker.ip.get(ip) || { count: 0, firstSeen: Date.now(), blocked: false };
  ipEntry.blocked = true;
  abuseTracker.ip.set(ip, ipEntry);
  
  if (userId) {
    const userEntry = abuseTracker.user.get(userId) || { count: 0, firstSeen: Date.now(), blocked: false };
    userEntry.blocked = true;
    abuseTracker.user.set(userId, userEntry);
  }
  
  // Auto-unblock after duration
  setTimeout(() => {
    const ipEntry = abuseTracker.ip.get(ip);
    if (ipEntry) {
      ipEntry.blocked = false;
    }
    if (userId) {
      const userEntry = abuseTracker.user.get(userId);
      if (userEntry) {
        userEntry.blocked = false;
      }
    }
  }, durationMs);
}

/**
 * Abuse detection middleware - blocks clients with too many failed requests
 */
export function abuseDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const blocked = isBlocked(req);
  if (blocked.blocked) {
    return res.status(403).json({
      error: 'Access denied',
      details: blocked.reason,
    });
  }
  
  next();
}

/**
 * General API rate limiter - IP-based
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    details: 'Please try again later',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    trackFailedRequest(req, 'rate_limit_exceeded');
    res.status(429).json({
      error: 'Too many requests',
      details: 'Rate limit exceeded. Please try again later.',
    });
  },
});

/**
 * Strict rate limiter for sensitive endpoints (payments, etc.)
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many requests',
    details: 'Rate limit exceeded for this endpoint',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    trackFailedRequest(req, 'strict_rate_limit_exceeded');
    res.status(429).json({
      error: 'Too many requests',
      details: 'Rate limit exceeded for this sensitive endpoint. Please try again later.',
    });
  },
});

/**
 * User-based rate limiter (if user is authenticated)
 */
export const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each user to 200 requests per windowMs
  keyGenerator: (req) => {
    const userId = getUserId(req);
    return userId || getClientIp(req); // Fallback to IP if no user
  },
  message: {
    error: 'Too many requests',
    details: 'User rate limit exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    trackFailedRequest(req, 'user_rate_limit_exceeded');
    res.status(429).json({
      error: 'Too many requests',
      details: 'User rate limit exceeded. Please try again later.',
    });
  },
});

/**
 * Slow down middleware - gradually increases response time for repeated requests
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: 100, // Add 100ms delay per request after delayAfter
  maxDelayMs: 2000, // Maximum delay of 2 seconds
  skip: (req) => {
    return req.path === '/health';
  },
});

/**
 * Request size limiter middleware
 */
export function requestSizeLimiter(maxSizeBytes: number = 1024 * 1024) { // Default 1MB
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSizeBytes) {
      trackFailedRequest(req, 'request_too_large');
      return res.status(413).json({
        error: 'Request too large',
        details: `Request body exceeds maximum size of ${maxSizeBytes / 1024}KB`,
      });
    }
    
    next();
  };
}
