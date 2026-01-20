import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { CopyButton } from '@/components/CopyButton';
import { StatusChip } from '@/components/StatusChip';
import { CheckCircle, XCircle, Loader2, ExternalLink, Copy, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsService } from '@/services/payments';
import type { PaymentIntent } from '@/types';
import { apiClient } from '@/lib/api-client';

export default function PaymentLinkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authenticated, ready } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadIntent();
  }, [id]);

  const loadIntent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await paymentsService.getIntent(id);
      setIntent(data);
      
      // Check if expired
      if (data?.paymentLink?.expiresAt && Date.now() > data.paymentLink.expiresAt) {
        toast.error('Payment link has expired');
      }
    } catch (error) {
      console.error('Failed to load payment intent:', error);
      toast.error('Failed to load payment link');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!intent || !id) return;
    
    // Check if user is authenticated
    if (!authenticated || privyWallets.length === 0) {
      toast.error('Please connect your wallet to pay');
      return;
    }

    setPaying(true);
    try {
      // For Privy wallets, we need to sign the transaction
      // This is a simplified flow - in production, you'd use Privy's transaction signing
      const payerWallet = privyWallets[0];
      
      // Call execute endpoint - it will handle Privy signing
      const result = await apiClient.post<{ success: boolean; txHash?: string; requiresFrontendSigning?: boolean }>(
        `/payments/${id}/execute`,
        {}
      );

      if (result.success) {
        if (result.requiresFrontendSigning) {
          // TODO: Implement Privy transaction signing here
          // For now, show a message
          toast.info('Transaction signing required. Please sign in your wallet.');
        } else {
          toast.success('Payment executed successfully!', {
            description: result.txHash ? `Transaction: ${result.txHash.slice(0, 10)}...` : '',
          });
          await loadIntent(); // Refresh
        }
      } else {
        toast.error('Payment failed', {
          description: 'Please try again or contact support.',
        });
      }
    } catch (error) {
      console.error('Payment execution error:', error);
      toast.error('Failed to execute payment', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSkeleton variant="card" count={1} />
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Link Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This payment link may have been deleted or the ID is incorrect.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if expired
  const isExpired = intent.paymentLink?.expiresAt && Date.now() > intent.paymentLink.expiresAt;
  const isPaid = intent.status === 'succeeded' || intent.status === 'executing';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Pay with USDC</CardTitle>
            <StatusChip status={intent.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount */}
          <div className="text-center py-6 border-b">
            <p className="text-sm text-muted-foreground mb-2">Amount</p>
            <p className="text-4xl font-bold">
              ${intent.amount.toLocaleString()} {intent.currency}
            </p>
            <p className="text-sm text-muted-foreground mt-2">on {intent.chain}</p>
          </div>

          {/* Description */}
          {intent.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{intent.description}</p>
            </div>
          )}

          {/* Recipient */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Recipient</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1">
                {intent.recipientAddress.slice(0, 10)}...{intent.recipientAddress.slice(-8)}
              </code>
              <CopyButton value={intent.recipientAddress} />
            </div>
          </div>

          {/* Status Messages */}
          {isExpired && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              This payment link has expired.
            </div>
          )}

          {isPaid && (
            <div className="rounded-md bg-success/10 p-3 text-sm text-success flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Payment {intent.status === 'succeeded' ? 'completed' : 'processing'}
            </div>
          )}

          {intent.txHash && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Transaction</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1">
                  {intent.txHash.slice(0, 10)}...{intent.txHash.slice(-8)}
                </code>
                <CopyButton value={intent.txHash} />
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Payment Button */}
          {!isPaid && !isExpired && (
            <div className="space-y-3 pt-4">
              {!authenticated && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="mb-2">Connect your wallet to pay</p>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </Button>
                </div>
              )}

              {authenticated && privyWallets.length > 0 && (
                <Button
                  onClick={handlePay}
                  disabled={paying}
                  className="w-full"
                  size="lg"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay ${intent.amount} USDC
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Payment Link Info */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Powered by OmniAgentPay on ARC Testnet
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
