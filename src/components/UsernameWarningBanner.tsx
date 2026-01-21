import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ensureUserInSupabase } from '@/lib/supabase';
import { getUserByPrivyId } from '@/services/supabase/users';
import { cn } from '@/lib/utils';

/**
 * Username Warning Banner
 * 
 * Displays a prominent warning banner at the top of the application
 * when a user has not claimed a username, indicating they need to
 * do so to use omnipayagent.
 */
export function UsernameWarningBanner() {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUsername = async () => {
    if (!authenticated || !user) {
      setHasUsername(null);
      setLoading(false);
      return;
    }

    try {
      const privyUserId = user?.id;
      if (!privyUserId) {
        setHasUsername(null);
        setLoading(false);
        return;
      }

      const email = user?.email?.address || user?.google?.email || undefined;
      const walletAddress = user?.wallet?.address || wallets?.[0]?.address || undefined;

      await ensureUserInSupabase(privyUserId, email, walletAddress);

      const userData = await getUserByPrivyId(privyUserId);
      const username = userData?.username;
      
      setHasUsername(!!username && username.trim().length > 0);
    } catch (error) {
      console.error('Error checking username:', error);
      setHasUsername(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUsername();
  }, [authenticated, user, wallets]);

  // Listen for username update events
  useEffect(() => {
    const handleUsernameUpdate = () => {
      // Refresh username check when username is updated
      setLoading(true);
      checkUsername();
    };

    window.addEventListener('username-updated', handleUsernameUpdate);
    return () => {
      window.removeEventListener('username-updated', handleUsernameUpdate);
    };
  }, [authenticated, user, wallets]);

  // Don't show banner if not authenticated, still loading, or username exists
  if (!authenticated || loading || hasUsername) {
    return null;
  }

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
      className={cn(
        "sticky top-16 z-40 w-full",
        "bg-warning/10 border-b border-warning/30 backdrop-blur-sm",
        "shadow-sm"
      )}
    >
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <AlertCircle className="h-5 w-5 text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Username Required
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You need to claim a username to be able to start using omnipayagent. 
              Please set your username in Settings to continue.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/settings')}
            className="shrink-0 border-warning/50 hover:bg-warning/20 hover:border-warning text-foreground"
          >
            Go to Settings
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
