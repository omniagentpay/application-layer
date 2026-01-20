/**
 * Rate Limiter for Gemini API
 * 
 * Prevents API key misuse by limiting requests per user session
 * Uses browser localStorage to persist rate limit data across page refreshes
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
}

// Get rate limit config from environment variables or use defaults
// Note: Environment variables are accessed at runtime, not module load time
const getDefaultConfig = (): RateLimitConfig => {
  // Access environment variables (import.meta.env is always available in Vite)
  const env = import.meta.env || {};
  return {
    maxRequestsPerMinute: Number((env as any).VITE_GEMINI_RATE_LIMIT_PER_MINUTE) || 10,
    maxRequestsPerHour: Number((env as any).VITE_GEMINI_RATE_LIMIT_PER_HOUR) || 60,
    maxRequestsPerDay: Number((env as any).VITE_GEMINI_RATE_LIMIT_PER_DAY) || 200,
  };
};

// Default config - can be overridden via environment variables
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinute: 10,  // 10 requests per minute
  maxRequestsPerHour: 60,     // 60 requests per hour
  maxRequestsPerDay: 200,     // 200 requests per day
};

const STORAGE_KEY_PREFIX = 'gemini_rate_limit_';

/**
 * Get a unique session identifier
 * Uses a combination of browser fingerprint and stored session ID
 */
function getSessionId(): string {
  // Try to get existing session ID from storage
  let sessionId = localStorage.getItem('gemini_session_id');
  
  if (!sessionId) {
    // Generate a new session ID based on browser characteristics
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    sessionId = `session_${Math.abs(hash)}_${Date.now()}`;
    localStorage.setItem('gemini_session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * Get storage key for a specific time window
 */
function getStorageKey(window: 'minute' | 'hour' | 'day'): string {
  const sessionId = getSessionId();
  const now = new Date();
  
  let timeKey: string;
  switch (window) {
    case 'minute':
      timeKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      break;
    case 'hour':
      timeKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}`;
      break;
    case 'day':
      timeKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      break;
  }
  
  return `${STORAGE_KEY_PREFIX}${window}_${sessionId}_${timeKey}`;
}

/**
 * Get reset time for a specific window
 */
function getResetTime(window: 'minute' | 'hour' | 'day'): number {
  const now = new Date();
  const resetTime = new Date();
  
  switch (window) {
    case 'minute':
      resetTime.setMinutes(now.getMinutes() + 1);
      resetTime.setSeconds(0);
      resetTime.setMilliseconds(0);
      break;
    case 'hour':
      resetTime.setHours(now.getHours() + 1);
      resetTime.setMinutes(0);
      resetTime.setSeconds(0);
      resetTime.setMilliseconds(0);
      break;
    case 'day':
      resetTime.setDate(now.getDate() + 1);
      resetTime.setHours(0);
      resetTime.setMinutes(0);
      resetTime.setSeconds(0);
      resetTime.setMilliseconds(0);
      break;
  }
  
  return resetTime.getTime();
}

/**
 * Clean up old rate limit entries
 */
function cleanupOldEntries(): void {
  const keys = Object.keys(localStorage);
  const now = Date.now();
  
  keys.forEach(key => {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const entry = JSON.parse(localStorage.getItem(key) || '{}') as RateLimitEntry;
        // Remove entries that are older than 24 hours
        if (entry.resetTime && entry.resetTime < now - 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
        }
      } catch {
        // Invalid entry, remove it
        localStorage.removeItem(key);
      }
    }
  });
}

/**
 * Check if a request is allowed based on rate limits
 */
export function checkRateLimit(config: Partial<RateLimitConfig> = {}): {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  limits?: {
    minute: { current: number; max: number; resetAt: number };
    hour: { current: number; max: number; resetAt: number };
    day: { current: number; max: number; resetAt: number };
  };
} {
  cleanupOldEntries();
  
  const limits = { ...DEFAULT_CONFIG, ...config };
  
  const windows: Array<{ window: 'minute' | 'hour' | 'day'; max: number }> = [
    { window: 'minute', max: limits.maxRequestsPerMinute },
    { window: 'hour', max: limits.maxRequestsPerHour },
    { window: 'day', max: limits.maxRequestsPerDay },
  ];
  
  const limitStatus: {
    minute: { current: number; max: number; resetAt: number };
    hour: { current: number; max: number; resetAt: number };
    day: { current: number; max: number; resetAt: number };
  } = {
    minute: { current: 0, max: limits.maxRequestsPerMinute, resetAt: 0 },
    hour: { current: 0, max: limits.maxRequestsPerHour, resetAt: 0 },
    day: { current: 0, max: limits.maxRequestsPerDay, resetAt: 0 },
  };
  
  for (const { window, max } of windows) {
    const key = getStorageKey(window);
    const resetTime = getResetTime(window);
    
    try {
      const entry = JSON.parse(localStorage.getItem(key) || '{}') as RateLimitEntry;
      
      // Check if the entry is expired
      if (entry.resetTime && entry.resetTime < Date.now()) {
        // Reset the entry
        const newEntry: RateLimitEntry = { count: 0, resetTime };
        localStorage.setItem(key, JSON.stringify(newEntry));
        limitStatus[window] = { current: 0, max, resetAt: resetTime };
      } else {
        // Use existing entry or create new one
        const currentEntry: RateLimitEntry = entry.count !== undefined 
          ? entry 
          : { count: 0, resetTime };
        
        limitStatus[window] = {
          current: currentEntry.count,
          max,
          resetAt: currentEntry.resetTime || resetTime,
        };
        
        // Check if limit is exceeded
        if (currentEntry.count >= max) {
          const retryAfter = Math.ceil((currentEntry.resetTime - Date.now()) / 1000);
          return {
            allowed: false,
            reason: `Rate limit exceeded: ${currentEntry.count}/${max} requests per ${window}. Please try again later.`,
            retryAfter: retryAfter > 0 ? retryAfter : 0,
            limits: limitStatus,
          };
        }
      }
    } catch (error) {
      // If there's an error reading from storage, allow the request but log the error
      console.warn('Rate limit check error:', error);
    }
  }
  
  return {
    allowed: true,
    limits: limitStatus,
  };
}

/**
 * Record a request (increment the counter)
 */
export function recordRequest(config: Partial<RateLimitConfig> = {}): void {
  cleanupOldEntries();
  
  // Merge default config with environment overrides and provided config
  const envConfig = getDefaultConfig();
  const limits = { ...DEFAULT_CONFIG, ...envConfig, ...config };
  const windows: Array<'minute' | 'hour' | 'day'> = ['minute', 'hour', 'day'];
  
  for (const window of windows) {
    const key = getStorageKey(window);
    const resetTime = getResetTime(window);
    
    try {
      const entry = JSON.parse(localStorage.getItem(key) || '{}') as RateLimitEntry;
      
      // Check if the entry is expired
      if (entry.resetTime && entry.resetTime < Date.now()) {
        // Reset the entry
        const newEntry: RateLimitEntry = { count: 1, resetTime };
        localStorage.setItem(key, JSON.stringify(newEntry));
      } else {
        // Increment the count
        const newEntry: RateLimitEntry = {
          count: (entry.count || 0) + 1,
          resetTime: entry.resetTime || resetTime,
        };
        localStorage.setItem(key, JSON.stringify(newEntry));
      }
    } catch (error) {
      // If there's an error, create a new entry
      const newEntry: RateLimitEntry = { count: 1, resetTime };
      localStorage.setItem(key, JSON.stringify(newEntry));
    }
  }
}

/**
 * Reset rate limits for the current session (for testing/admin purposes)
 */
export function resetRateLimits(): void {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
  localStorage.removeItem('gemini_session_id');
}
