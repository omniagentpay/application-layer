/**
 * DEV-ONLY Authentication Bypass Utilities
 * 
 * Provides auth bypass state for frontend when testing with Antigravity.
 * When enabled, skips Privy auth UI and injects fixed dev user ID.
 * 
 * Security: Frontend bypass is cosmetic only - backend middleware 
 * handles actual auth bypass. This just skips UI and provides user ID.
 */

export interface DevAuthState {
    enabled: boolean;
    privyUserId: string;
}

/**
 * Get dev auth bypass state from environment
 */
export function getDevAuthState(): DevAuthState {
    const enabled = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';
    const privyUserId = 'antigravity-demo-user'; // Hardcoded for safety

    return { enabled, privyUserId };
}

/**
 * Check if dev auth bypass is enabled
 */
export function isDevAuthEnabled(): boolean {
    return getDevAuthState().enabled;
}

/**
 * Get the dev bypass Privy user ID
 * Returns empty string if bypass not enabled
 */
export function getDevPrivyUserId(): string {
    const state = getDevAuthState();
    return state.enabled ? state.privyUserId : '';
}
