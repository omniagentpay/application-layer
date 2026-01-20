import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatusChip } from '@/components/StatusChip';
import { CopyButton } from '@/components/CopyButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { walletsService } from '@/services/wallets';
import { paymentsService } from '@/services/payments';
import type { Wallet as WalletType, Transaction } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export default function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [walletData, txData] = await Promise.all([
      walletsService.getWallet(id),
      paymentsService.getTransactions({ walletId: id }),
    ]);
    setWallet(walletData);
    setTransactions(txData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Wallet Details"
          breadcrumbs={[
            { label: 'Wallets', href: '/app/wallets' },
            { label: 'Loading...' },
          ]}
        />
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div>
        <PageHeader
          title="Wallet Not Found"
          breadcrumbs={[
            { label: 'Wallets', href: '/app/wallets' },
            { label: 'Not Found' },
          ]}
        />
        <p>The requested wallet could not be found.</p>
        <Link to="/app/wallets">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Wallets
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={wallet.name}
        breadcrumbs={[
          { label: 'Wallets', href: '/app/wallets' },
          { label: wallet.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Receive
            </Button>
            <Button>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Fund Wallet
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Balance Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{wallet.name}</CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">{wallet.chain}</p>
                  </div>
                </div>
                <StatusChip status={wallet.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">USDC Balance</p>
                  <p className="text-3xl font-semibold">${wallet.balance.usdc.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Native Balance</p>
                  <p className="text-3xl font-semibold">{wallet.balance.native.toFixed(4)}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-2">Wallet Address</p>
                <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                  <code className="text-sm font-mono flex-1">{wallet.address}</code>
                  <CopyButton value={wallet.address} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          tx.type === 'fund' ? 'bg-success/10' : 'bg-muted'
                        }`}>
                          {tx.type === 'fund' ? (
                            <ArrowDownLeft className="h-4 w-4 text-success" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {tx.type === 'payment' ? `Payment to ${tx.recipient}` :
                             tx.type === 'fund' ? 'Wallet funded' :
                             tx.type === 'bridge' ? 'Bridge transfer' :
                             'Transfer'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          tx.type === 'fund' ? 'text-success' : ''
                        }`}>
                          {tx.type === 'fund' ? '+' : '-'}${tx.amount.toLocaleString()}
                        </p>
                        <StatusChip status={tx.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Send Payment
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <ArrowDownLeft className="h-4 w-4 mr-2" />
                Receive Funds
              </Button>
              <Link to="/app/crosschain" className="block">
                <Button variant="outline" className="w-full justify-start">
                  Bridge to Another Chain
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Wallet Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(wallet.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{new Date(wallet.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="capitalize">{wallet.chain}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
