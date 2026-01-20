import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Zap,
  Wallet,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AtSign,
  Loader2,
} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { updateUsername, markOnboardingCompleted } from '@/services/supabase/users';
import { ensureUserInSupabase } from '@/lib/supabase';

interface WelcomeOnboardingProps {
  userId: string;
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    title: 'Welcome to OmniAgentPay',
    description:
      'Your all-in-one platform for managing autonomous payment systems. Get started with AI-powered agents, secure wallets, and cross-chain transfers.',
    icon: Zap,
    color: 'text-primary',
  },
  {
    id: 2,
    title: 'Secure Wallet Management',
    description:
      'Connect your MetaMask wallet and manage multiple wallets across different chains. All transactions are secured with enterprise-grade encryption.',
    icon: Wallet,
    color: 'text-blue-500',
  },
  {
    id: 3,
    title: 'AI Payment Agents',
    description:
      'Create intelligent payment agents that can autonomously handle transactions, check balances, and execute payments based on your rules.',
    icon: Shield,
    color: 'text-green-500',
  },
  {
    id: 4,
    title: 'Cross-Chain Payments',
    description:
      'Send USDC across any blockchain seamlessly. Our platform supports multiple chains and handles all the complexity for you.',
    icon: ArrowRight,
    color: 'text-purple-500',
  },
];

export function WelcomeOnboarding({ userId, onComplete }: WelcomeOnboardingProps) {
  const { user, wallets } = usePrivy();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [username, setUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [claimingUsername, setClaimingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const walletAddress =
    user?.wallet?.address || wallets?.[0]?.address || '';

  useEffect(() => {
    // Validate username as user types
    if (username.length > 0) {
      setUsernameError('');
      if (username.length < 3) {
        setUsernameError('Username must be at least 3 characters');
      } else if (username.length > 20) {
        setUsernameError('Username must be less than 20 characters');
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameError('Username can only contain letters, numbers, and underscores');
      }
    }
  }, [username]);

  const handleNext = () => {
    if (currentSlide < slides.length) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleClaimUsername = async () => {
    if (!username.trim()) {
      setUsernameError('Please enter a username');
      return;
    }

    if (usernameError) {
      return;
    }

    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    setClaimingUsername(true);
    setUsernameError('');

    try {
      const result = await updateUsername(userId, username, walletAddress);

      if (!result.success) {
        setUsernameError(result.error || 'Failed to claim username');
        return;
      }

      // Mark onboarding as completed
      await markOnboardingCompleted(userId);

      toast.success(`Username @${username} claimed successfully!`);
      onComplete();
    } catch (error) {
      console.error('Error claiming username:', error);
      setUsernameError('Failed to claim username. Please try again.');
    } finally {
      setClaimingUsername(false);
    }
  };

  const isLastSlide = currentSlide === slides.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl mx-4"
      >
        <Card className="border-2">
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {!isLastSlide ? (
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="flex justify-center mb-4">
                    <div
                      className={`w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center ${
                        slides[currentSlide].color
                      }`}
                    >
                      {(() => {
                        const IconComponent = slides[currentSlide].icon;
                        return IconComponent ? <IconComponent className="w-10 h-10" /> : null;
                      })()}
                    </div>
                  </div>

                  <h2 className="text-3xl font-bold">
                    {slides[currentSlide].title}
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    {slides[currentSlide].description}
                  </p>

                  <div className="flex items-center justify-center gap-2 pt-4">
                    {slides.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 rounded-full transition-all ${
                          index === currentSlide
                            ? 'w-8 bg-primary'
                            : 'w-2 bg-muted'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentSlide === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <Button onClick={handleNext}>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-4">
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <AtSign className="w-10 h-10" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold">Claim Your Username</h2>
                    <p className="text-lg text-muted-foreground">
                      Choose a unique username that will be permanently linked to
                      your wallet address. This will be displayed throughout the
                      platform.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Username
                      </label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="yourusername"
                          value={username}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                            setUsername(value);
                          }}
                          className="pl-10 text-lg"
                          maxLength={20}
                          disabled={claimingUsername}
                        />
                      </div>
                      {usernameError && (
                        <p className="text-sm text-destructive mt-2">
                          {usernameError}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Your username will be displayed as @{username || 'username'}
                      </p>
                    </div>

                    {walletAddress && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          Wallet Address
                        </p>
                        <p className="text-sm font-mono">
                          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-4">
                      <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={claimingUsername}
                        className="flex-1"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleClaimUsername}
                        disabled={
                          !username.trim() ||
                          username.length < 3 ||
                          !!usernameError ||
                          claimingUsername ||
                          !walletAddress
                        }
                        className="flex-1"
                      >
                        {claimingUsername ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Claim Username
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
