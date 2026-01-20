import type { Request, Response, NextFunction } from 'express';

/**
 * DEV-ONLY Authentication Bypass Middleware
 * 
 * WARNING: This bypasses Privy authentication for automated testing with Antigravity.
 * CRITICAL: Never active in production (NODE_ENV === 'production').
 * 
 * When enabled via DEV_AUTH_BYPASS=true:
 * - Injects DEV_PRIVY_USER_ID into X-Privy-User-Id header if not present
 * - Marks request as dev bypass for logging purposes
 * - Allows Antigravity to access all endpoints without wallet authentication
 * 
 * Security guarantees:
 * - Fails hard in production environment
 * - All bypass activity is clearly logged
 * - No changes to Circle, MCP, or payment execution logic
 */

export interface DevAuthConfig {
    enabled: boolean;
    privyUserId: string;
}

/**
 * Get dev auth configuration from environment variables
 * 
 * CRITICAL: Always returns disabled config in production
 */
export function getDevAuthConfig(): DevAuthConfig {
    // CRITICAL: Fail hard in production - never allow bypass
    if (process.env.NODE_ENV === 'production') {
        return { enabled: false, privyUserId: '' };
    }

    const enabled = process.env.DEV_AUTH_BYPASS === 'true';
    const privyUserId = process.env.DEV_PRIVY_USER_ID || '';

    // Validate configuration
    if (enabled && !privyUserId) {
        console.error('[DEV AUTH BYPASS] ERROR: DEV_AUTH_BYPASS enabled but DEV_PRIVY_USER_ID not set');
        console.error('[DEV AUTH BYPASS] Bypass will be disabled for safety');
        return { enabled: false, privyUserId: '' };
    }

    return { enabled, privyUserId };
}

/**
 * Express middleware to bypass Privy authentication in dev mode
 * 
 * Injects dev user ID into request headers if bypass is enabled.
 * Falls through to normal flow if disabled.
 */
export function devAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const config = getDevAuthConfig();

    // Bypass not enabled - continue normal flow
    if (!config.enabled) {
        return next();
    }

    // DEV BYPASS ACTIVE
    const existingUserId = req.headers['x-privy-user-id'];

    if (!existingUserId) {
        // Inject dev user ID
        req.headers['x-privy-user-id'] = config.privyUserId;
        console.log(`[DEV AUTH BYPASS] Injected privy_user_id=${config.privyUserId} for ${req.method} ${req.path}`);
    } else {
        console.log(`[DEV AUTH BYPASS] Using existing privy_user_id=${existingUserId} for ${req.method} ${req.path}`);
    }

    // Mark request as bypassed for downstream logging
    (req as any).isDevBypass = true;

    next();
}
