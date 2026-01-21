import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePrivy, useWallets as usePrivyWallets } from '@privy-io/react-auth';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/CopyButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Wallet,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  QrCode,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { agentWalletService, type AgentWallet } from '@/services/wallets';
import { walletsService } from '@/services/wallets';
import type { Wallet as WalletType } from '@/types';
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
import { QRCodeSVG } from 'qrcode.react';

export default function ManageWalletsPage() {
  const { user, authenticated } = usePrivy();
  const { wallets: privyWallets } = usePrivyWallets();
  
  // Agent Wallet State
  const [agentWallet, setAgentWallet] = useState<AgentWallet | null>(null);
  const [agentWalletLoading, setAgentWalletLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const hasShownCreationNotification = useRef(false);
  const createdWalletAddress = useRef<string | null>(null);

  // Privy Wallets State
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [unifiedBalance, setUnifiedBalance] = useState<{ total: number; byChain: Record<string, number> } | null>(null);

  useEffect(() => {
    if (authenticated && user?.id) {
      loadAgentWallet();
      loadPrivyWallets();
    }
  }, [authenticated, user?.id, privyWallets]);

  const loadAgentWallet = async () => {
    if (!user?.id) return;

    setAgentWalletLoading(true);
    try {
      let wallet = await agentWalletService.getAgentWallet(user.id);

      // Auto-create if it doesn't exist
      if (!wallet) {
        try {
          wallet = await agentWalletService.createAgentWallet(user.id);
          
          const walletAddress = wallet.address;
          const notificationKey = `wallet_created_${walletAddress}`;
          const hasBeenNotified = sessionStorage.getItem(notificationKey);
          
          if (!hasBeenNotified && !hasShownCreationNotification.current) {
            toast.success('Agent wallet created successfully!');
            sessionStorage.setItem(notificationKey, 'true');
            hasShownCreationNotification.current = true;
            createdWalletAddress.current = walletAddress;
          }
        } catch (createError) {
          const errorMessage = createError instanceof Error ? createError.message : 'Unknown error occurred';
          if (!errorMessage.includes('Cannot connect to backend')) {
            toast.error('Failed to create agent wallet', {
              description: errorMessage,
            });
          }
          setAgentWalletLoading(false);
          return;
        }
      } else {
        if (createdWalletAddress.current && createdWalletAddress.current !== wallet.address) {
          hasShownCreationNotification.current = false;
          createdWalletAddress.current = null;
        }
      }

      setAgentWallet(wallet);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('Cannot connect to backend') || errorMessage.includes('fetch')) {
        toast.error('Backend server not available', {
          description: 'Please make sure the backend server is running on port 3001.',
          duration: 10000,
        });
      } else if (!errorMessage.includes('404')) {
        toast.error('Failed to load agent wallet', {
          description: errorMessage,
        });
      }
    } finally {
      setAgentWalletLoading(false);
    }
  };

  const loadPrivyWallets = async () => {
    setWalletsLoading(true);
    try {
      const walletAddresses = privyWallets.map(pw => pw.address);
      
      if (walletAddresses.length === 0) {
        setWallets([]);
        setUnifiedBalance({ total: 0, byChain: {} });
        setWalletsLoading(false);
        return;
      }
      
      const balanceData = await walletsService.getUnifiedBalance(walletAddresses);
      setUnifiedBalance(balanceData);
      
      const walletsData = await walletsService.getWallets(walletAddresses);
      
      if (walletsData.length === 0) {
        const mappedWallets: WalletType[] = await Promise.all(
          privyWallets.map(async (pw, index) => {
            try {
              const balance = await walletsService.getWalletBalance(pw.address);
              const usdcToken = balance?.tokens.find(t => t.currency === 'USDC');
              return {
                id: pw.address,
                name: pw.walletClientType === 'privy' ? 'Privy Embedded Wallet' : `Wallet ${index + 1}`,
                address: pw.address,
                chain: 'arc-testnet' as WalletType['chain'],
                balance: {
                  usdc: parseFloat(usdcToken?.amount || balance?.native.amount || '0'),
                  native: parseFloat(balance?.native.amount || '0'),
                },
                status: 'active' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            } catch (error) {
              console.error(`Failed to fetch balance for wallet ${pw.address}:`, error);
              return {
                id: pw.address,
                name: pw.walletClientType === 'privy' ? 'Privy Embedded Wallet' : `Wallet ${index + 1}`,
                address: pw.address,
                chain: 'arc-testnet' as WalletType['chain'],
                balance: { usdc: 0, native: 0 },
                status: 'active' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            }
          })
        );
        setWallets(mappedWallets);
      } else {
        setWallets(walletsData);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      setWallets([]);
      setUnifiedBalance({ total: 0, byChain: {} });
    } finally {
      setWalletsLoading(false);
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
      
      if (createdWalletAddress.current) {
        const oldNotificationKey = `wallet_created_${createdWalletAddress.current}`;
        sessionStorage.removeItem(oldNotificationKey);
      }
      hasShownCreationNotification.current = false;
      createdWalletAddress.current = null;
      
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

    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask not found', {
        description: 'Please install MetaMask to fund your wallet.',
      });
      return;
    }

    navigator.clipboard.writeText(agentWallet.address);
    toast.info('Wallet address copied', {
      description: 'Please paste the address in MetaMask and send USDC (Arc Testnet).',
      duration: 5000,
    });

    window.open(`https://testnet.arcscan.app/address/${agentWallet.address}`, '_blank');
  };

  const handleOpenFaucet = () => {
    if (!agentWallet) return;

    navigator.clipboard.writeText(agentWallet.address);
    window.open('https://faucet.testnet.arc.network', '_blank');

    toast.info('Wallet address copied', {
      description: 'Paste the address in the Arc faucet to get test USDC.',
      duration: 5000,
    });
  };

  const handleShowQRCode = () => {
    if (agentWallet) {
      setQrDialogOpen(true);
    }
  };

  const loading = agentWalletLoading || walletsLoading;

  if (loading) {
    return (
      <div>
        <PageHeader title="Manage Wallets" />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Manage Wallets"
        description="Manage your agent wallet and connected Privy wallets"
      />

      {/* Agent Wallet Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Agent Wallet (Circle, app-controlled)</h2>
        
        {!agentWallet ? (
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
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      About Agent Wallets
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Circle wallet managed by the system for autonomous AI agent payments. Arc Testnet only.
                    </CardDescription>
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

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Wallet Address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1">
                      {agentWallet.address}
                    </code>
                    <CopyButton value={agentWallet.address} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowQRCode}
                      title="Show QR Code"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Information Card */}
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

            {/* Funding Checklist */}
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
                      <p className="text-xs text-muted-foreground">Use the copy button or QR code next to the address above</p>
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
                      <p className="text-xs text-muted-foreground">Update to see your new balance</p>
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
            <Card className="mb-8">
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
          </>
        )}
      </div>

      {/* Privy Wallets Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Connected Wallets (Privy)</h2>
        
        {/* Unified Balance */}
        {unifiedBalance && (
          <Card className="mb-6 max-w-md">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Total Balance (ARC Network)</p>
              <p className="text-3xl font-semibold">${unifiedBalance.total.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">USDC</p>
            </CardContent>
          </Card>
        )}

        {/* Wallet Grid */}
        {wallets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">No wallets connected</p>
              <p className="text-sm text-muted-foreground">
                Connect a wallet using Privy to view your balance on ARC Network.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {wallets.map((wallet) => (
              <Card key={wallet.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{wallet.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">ARC Testnet</p>
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            Privy
                          </span>
                        </div>
                      </div>
                    </div>
                    <StatusChip status={wallet.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">USDC Balance</p>
                      <p className="text-xl font-semibold">${wallet.balance.usdc.toLocaleString()}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono">{wallet.address}</code>
                        <CopyButton value={wallet.address} />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link to={`/app/wallets/${wallet.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" className="flex-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        Fund
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agent Wallet Address QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to copy the wallet address. The QR code contains the wallet address that can be scanned and pasted.
            </DialogDescription>
          </DialogHeader>
          {agentWallet && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={agentWallet.address}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="w-full">
                <p className="text-sm text-muted-foreground mb-2 text-center">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 text-center">
                    {agentWallet.address}
                  </code>
                  <CopyButton value={agentWallet.address} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Scan the QR code with any QR scanner app. The wallet address will be copied to your clipboard when scanned.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
