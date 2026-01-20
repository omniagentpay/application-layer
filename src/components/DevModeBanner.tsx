import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isDevAuthEnabled } from '@/lib/dev-auth';

/**
 * Demo Mode Banner - MANDATORY when dev auth bypass is enabled
 * 
 * Displays a prominent warning banner at the top of the application
 * to clearly indicate that authentication is bypassed for testing.
 */
export function DevModeBanner() {
    const enabled = isDevAuthEnabled();

    if (!enabled) {
        return null;
    }

    return (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 sticky top-0 z-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Demo / Sandbox Mode</AlertTitle>
            <AlertDescription>
                Authentication bypassed for automated testing. Wallet signing disabled.
            </AlertDescription>
        </Alert>
    );
}
