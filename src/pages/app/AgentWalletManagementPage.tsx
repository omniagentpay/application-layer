import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/CopyButton';
import {
  Wallet,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  QrCode,
  Trash2,
} from 'lucide-react';
import { agentWalletService, type AgentWallet } from '@/services/wallets';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWallets as usePrivyWallets } from '@privy-io/react-auth';

export default function AgentWalletManagementPage() {
  const { user, authenticated } = usePrivy();
  const { wallets: privyWallets } = usePrivyWallets();
  const [agentWallet, setAgentWallet] = useState<AgentWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (authenticated && user?.id) {
      loadAgentWallet();
    }
  }, [authenticated, user?.id]);

  const loadAgentWallet = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let wallet = await agentWalletService.getAgentWallet(user.id);

      // Auto-create if it doesn't exist
      if (!wallet) {
        try {
          wallet = await agentWalletService.createAgentWallet(user.id);
          toast.success('Agent wallet created successfully!');
        } catch (createError) {
          // If creation fails, show error but don't set wallet
          const errorMessage = createError instanceof Error ? createError.message : 'Unknown error occurred';

          // Don't show error if it's a network error (already handled)
          if (!errorMessage.includes('Cannot connect to backend')) {
            toast.error('Failed to create agent wallet', {
              description: errorMessage,
            });
          }
          setLoading(false);
          return;
        }
      }

      setAgentWallet(wallet);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Check if it's a network/connection error
      if (errorMessage.includes('Cannot connect to backend') || errorMessage.includes('fetch')) {
        toast.error('Backend server not available', {
          description: 'Please make sure the backend server is running on port 3001.',
          duration: 10000,
        });
      } else if (!errorMessage.includes('404')) {
        // Don't show error for 404 (wallet not found is expected)
        toast.error('Failed to load agent wallet', {
          description: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBalance = async () => {
    if (!user?.id || !agentWallet) return;

    setRefreshing(true);
    try {
      const balanceData = await agentWalletService.getAgentWalletBalance(user.id);
      setAgentWallet({
        ...agentWallet,
        balance: balanceData.balance,
      });
      toast.success('Balance refreshed');
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      toast.error('Failed to refresh balance', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const resetWallet = async () => {
    if (!user?.id) return;

    setResetting(true);
    try {
      const newWallet = await agentWalletService.resetAgentWallet(user.id);
      setAgentWallet(newWallet);
      toast.success('Agent wallet reset successfully', {
        description: 'A new wallet has been created. The old wallet has been disabled.',
      });
    } catch (error) {
      console.error('Failed to reset wallet:', error);
      toast.error('Failed to reset wallet', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleFundFromMetaMask = () => {
    if (!agentWallet) return;

    // Check if MetaMask is available
    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask not found', {
        description: 'Please install MetaMask to fund your wallet.',
      });
      return;
    }

    // Open MetaMask with pre-filled transaction
    // Note: MetaMask doesn't support pre-filling, so we'll copy the address and show instructions
    navigator.clipboard.writeText(agentWallet.address);
    toast.info('Wallet address copied', {
      description: 'Please paste the address in MetaMask and send USDC (Arc Testnet).',
      duration: 5000,
    });

    // Open Arc Explorer for reference
    window.open(`https://testnet.arcscan.app/address/${agentWallet.address}`, '_blank');
  };

  const handleOpenFaucet = () => {
    if (!agentWallet) return;

    // Copy address to clipboard
    navigator.clipboard.writeText(agentWallet.address);

    // Open Arc faucet
    window.open('https://faucet.testnet.arc.network', '_blank');

    toast.info('Wallet address copied', {
      description: 'Paste the address in the Arc faucet to get test USDC.',
      duration: 5000,
    });
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Agent Wallet Management" />
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  if (!agentWallet) {
    return (
      <div>
        <PageHeader title="Agent Wallet Management" />
        <Card>
          <CardContent className="p-8 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">No agent wallet found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create an agent wallet to enable autonomous payments.
            </p>
            <Button onClick={loadAgentWallet}>Create Agent Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedAddress = `${agentWallet.address.slice(0, 6)}...${agentWallet.address.slice(-4)}`;

  return (
    <div>
      <PageHeader
        title="Agent Wallet (Circle, app-controlled)"
        description="Circle wallet managed by the system for autonomous AI agent payments. Arc Testnet only."
      />

      {/* Agent Wallet Overview Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                About Agent Wallets
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshBalance}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Balance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Wallet Type</p>
              <p className="text-base font-medium">Agent Wallet (Autonomous)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Network</p>
              <p className="text-base font-medium">Arc Testnet</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Balance</p>
              <p className="text-2xl font-semibold">{agentWallet.balance.toFixed(2)} USDC</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {agentWallet.status === 'active' ? 'Active' : agentWallet.status}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Wallet Address</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1">
                {agentWallet.address}
              </code>
              <CopyButton value={agentWallet.address} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Show QR code modal (simplified - just copy for now)
                  navigator.clipboard.writeText(agentWallet.address);
                  toast.info('Address copied to clipboard');
                }}
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PHASE 4: Wallet Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Wallet Information</CardTitle>
          <CardDescription>
            Circle wallet details for funding and verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-4 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-900 dark:text-amber-100 font-medium mb-2">
              ⚠️ Important: Funding Instructions
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Funds must be sent to the <strong>Circle wallet address</strong> shown below, not your Privy login wallet. The Circle wallet is app-controlled for autonomous payments.
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Circle Wallet ID</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1">
                {agentWallet.walletId}
              </code>
              <CopyButton value={agentWallet.walletId} />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Network</p>
            <p className="text-sm font-medium">Arc Testnet</p>
          </div>
        </CardContent>
      </Card>

      {/* PHASE 4: Funding Checklist */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Funding Checklist</CardTitle>
          <CardDescription>
            Follow these steps to fund your agent wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-bold text-muted-foreground min-w-[20px]">1.</span>
              <div className="flex-1">
                <p className="font-medium">Copy the wallet address</p>
                <p className="text-xs text-muted-foreground">Use the copy button next to the address above</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-muted-foreground min-w-[20px]">2.</span>
              <div className="flex-1">
                <p className="font-medium">Send USDC to the address</p>
                <p className="text-xs text-muted-foreground">Use Arc Testnet faucet or transfer from another wallet</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-muted-foreground min-w-[20px]">3.</span>
              <div className="flex-1">
                <p className="font-medium">Wait 1-2 minutes for confirmation</p>
                <p className="text-xs text-muted-foreground">Allow time for the transaction to be processed</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-muted-foreground min-w-[20px]">4.</span>
              <div className="flex-1">
                <p className="font-medium">Click "Refresh Balance" below</p>
                <p className="text-xs text-muted-foreground">Update to see your new balance. If unavailable, check the debugId in error message</p>
              </div>
            </li>
          </ol>

          <Button
            onClick={handleRefreshBalance}
            disabled={refreshing}
            className="w-full mt-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Balance'}
          </Button>
        </CardContent>
      </Card>

      {/* Fund Wallet Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fund Wallet</CardTitle>
          <CardDescription>
            Fund your agent wallet to enable payments. You can fund from MetaMask or use the Arc faucet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Option 1: Fund from MetaMask (Recommended)</p>
              <p className="text-xs text-muted-foreground">
                Send USDC from your MetaMask wallet to the agent wallet address.
              </p>
              <Button onClick={handleFundFromMetaMask} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Fund from MetaMask
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Option 2: Faucet (Hackathon-friendly)</p>
              <p className="text-xs text-muted-foreground">
                Get test USDC from the Arc faucet. Wallet address will be auto-copied.
              </p>
              <Button onClick={handleOpenFaucet} variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Get Test USDC
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Wallet Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reset / Delete Agent Wallet
          </CardTitle>
          <CardDescription>
            This will disable the current agent wallet and create a new one. Make sure you withdraw funds before resetting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={resetting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Reset Agent Wallet
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Agent Wallet?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will disable the current agent wallet and stop agent execution.
                  A new Circle wallet will be created if you confirm.
                  <br /><br />
                  <strong>Warning:</strong> Make sure you withdraw funds before resetting.
                  The old wallet will be marked as inactive and cannot be used for payments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={resetWallet}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {resetting ? 'Resetting...' : 'Reset Wallet'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
