import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { PageLoader } from './PageLoader';
import { WelcomeOnboarding } from './WelcomeOnboarding';
import { ensureUserInSupabase } from '@/lib/supabase';
import { getUserByPrivyId } from '@/services/supabase/users';
import { agentWalletService } from '@/services/wallets';
import { isDevAuthEnabled, getDevPrivyUserId } from '@/lib/dev-auth';
import { setGlobalPrivyUserId } from '@/lib/api-client';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const devAuthEnabled = isDevAuthEnabled();
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  useEffect(() => {
    // DEV BYPASS: Skip Privy, init immediately with dev user
    if (devAuthEnabled) {
      initializeDevUser();
      return;
    }

    // Normal Privy flow
    if (ready && authenticated && user) {
      initializeUser();
    } else if (ready && !authenticated) {
      setLoading(false);
    }
  }, [ready, authenticated, user, wallets, devAuthEnabled]);

  /**
   * Initialize dev user when bypass is enabled
   */
  const initializeDevUser = async () => {
    try {
      const privyUserId = getDevPrivyUserId();
      
      // Set global Privy user ID for API client
      if (privyUserId) {
        setGlobalPrivyUserId(privyUserId);
      }

      console.log('[DEV AUTH BYPASS] Initializing with user:', privyUserId);

      // Ensure user exists in Supabase
      const userId = await ensureUserInSupabase(
        privyUserId,
        'dev@antigravity.local',
        undefined
      );

      if (!userId) {
        console.error('[DEV AUTH BYPASS] Failed to create Supabase user');
        setLoading(false);
        return;
      }

      setSupabaseUserId(userId);

      // Auto-create Circle agent wallet if it doesn't exist
      try {
        const agentWallet = await agentWalletService.getAgentWallet(privyUserId);
        if (!agentWallet) {
          console.log('[DEV AUTH BYPASS] Creating agent wallet...');
          await agentWalletService.createAgentWallet(privyUserId);
        }
      } catch (error) {
        console.error('[DEV AUTH BYPASS] Error ensuring agent wallet:', error);
        // Don't block user from accessing app if wallet creation fails
      }

      // Skip onboarding in dev mode
      setShowOnboarding(false);
      setLoading(false);
    } catch (error) {
      console.error('[DEV AUTH BYPASS] Initialization error:', error);
      setLoading(false);
    }
  };

  const initializeUser = async () => {
    try {
      const privyUserId = user?.id;
      const email = user?.email?.address || user?.google?.email || undefined;
      const walletAddress = user?.wallet?.address || wallets?.[0]?.address || undefined;

      if (!privyUserId) {
        setLoading(false);
        return;
      }
      
      // Set global Privy user ID for API client
      setGlobalPrivyUserId(privyUserId);

      // Ensure user exists in Supabase
      const userId = await ensureUserInSupabase(privyUserId, email, walletAddress);

      if (!userId) {
        console.error('Failed to get or create user in Supabase');
        setLoading(false);
        return;
      }

      setSupabaseUserId(userId);

      // Auto-create Circle agent wallet if it doesn't exist
      try {
        const agentWallet = await agentWalletService.getAgentWallet(privyUserId);
        if (!agentWallet) {
          // Wallet doesn't exist, create it
          await agentWalletService.createAgentWallet(privyUserId);
        }
      } catch (error) {
        console.error('Error ensuring agent wallet exists:', error);
        // Don't block user from accessing app if wallet creation fails
        // They can create it manually from the Wallet Management page
      }

      // Check if onboarding is completed
      // Note: onboarding_completed column doesn't exist in current schema
      // Skip onboarding check for now
      // const userData = await getUserByPrivyId(privyUserId);
      // if (userData && !userData.onboarding_completed) {
      //   setShowOnboarding(true);
      // }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing user:', error);
      setLoading(false);
    }
  };

  if (!ready || loading) {
    return <PageLoader text="Loading..." />;
  }

  // DEV BYPASS: Always authenticated
  if (devAuthEnabled) {
    return <>{children}</>;
  }

  // Normal flow
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (showOnboarding && supabaseUserId) {
    return (
      <WelcomeOnboarding
        userId={supabaseUserId}
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  return <>{children}</>;
}
