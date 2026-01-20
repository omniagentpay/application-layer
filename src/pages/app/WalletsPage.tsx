import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { PageHeader } from '@/components/PageHeader';
import { StatusChip } from '@/components/StatusChip';
import { CopyButton } from '@/components/CopyButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ExternalLink, ArrowUpRight } from 'lucide-react';
import { walletsService } from '@/services/wallets';
import type { Wallet as WalletType } from '@/types';

export default function WalletsPage() {
  const { user, authenticated } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [unifiedBalance, setUnifiedBalance] = useState<{ total: number; byChain: Record<string, number> } | null>(null);

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated, privyWallets]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get wallet addresses from Privy
      const walletAddresses = privyWallets.map(pw => pw.address);
      
      if (walletAddresses.length === 0) {
        setWallets([]);
        setUnifiedBalance({ total: 0, byChain: {} });
        setLoading(false);
        return;
      }
      
      // Get balance from ARC network using Privy wallets
      const balanceData = await walletsService.getUnifiedBalance(walletAddresses);
      setUnifiedBalance(balanceData);
      
      // Fetch wallets with balances from backend
      const walletsData = await walletsService.getWallets(walletAddresses);
      
      // If backend doesn't return wallets, create them from Privy wallets
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
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Wallets" />
        <LoadingSkeleton variant="metric" count={1} className="mb-6 max-w-sm" />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Wallets"
        description="Your wallets on ARC Network"
      />

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
      {wallets.length === 0 && !loading ? (
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
  );
}
