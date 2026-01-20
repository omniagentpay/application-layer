import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { paymentsService } from '@/services/payments';
import { walletsService } from '@/services/wallets';
import type { Wallet, ChainId } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface CreatePaymentIntentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ARC Network only for hackathon
const CHAINS: { value: ChainId; label: string }[] = [
  { value: 'arc-testnet', label: 'ARC Testnet' },
];

export function CreatePaymentIntentModal({
  open,
  onOpenChange,
  onSuccess,
}: CreatePaymentIntentModalProps) {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    recipient: '',
    recipientAddress: '',
    amount: '',
    description: '',
    walletId: '',
    chain: 'arc-testnet' as ChainId,
  });

  useEffect(() => {
    if (open) {
      loadWallets();
      // Reset form when modal opens
      setFormData({
        recipient: '',
        recipientAddress: '',
        amount: '',
        description: '',
        walletId: '',
        chain: 'arc-testnet',
      });
    }
  }, [open]);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const data = await walletsService.getWallets();
      setWallets(data);
      if (data.length > 0 && !formData.walletId) {
        setFormData((prev) => ({ ...prev, walletId: data[0].id }));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load wallets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.recipient || !formData.recipientAddress || !formData.amount || !formData.walletId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await paymentsService.createIntent({
        amount,
        recipient: formData.recipient,
        recipientAddress: formData.recipientAddress,
        description: formData.description,
        walletId: formData.walletId,
        chain: formData.chain,
      });

      toast({
        title: 'Success',
        description: 'Payment intent created successfully',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create payment intent',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Payment Intent</DialogTitle>
          <DialogDescription>
            Create a new payment intent to send funds to a recipient
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Name *</Label>
              <Input
                id="recipient"
                placeholder="e.g., OpenAI"
                value={formData.recipient}
                onChange={(e) => setFormData((prev) => ({ ...prev, recipient: e.target.value }))}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientAddress">Recipient Address *</Label>
              <Input
                id="recipientAddress"
                placeholder="0x..."
                value={formData.recipientAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, recipientAddress: e.target.value }))}
                required
                disabled={submitting}
              />
            </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USDC) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Network</Label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  ARC Testnet
                </div>
              </div>

            <div className="space-y-2">
              <Label htmlFor="wallet">Source Wallet *</Label>
              {loading ? (
                <div className="h-10 flex items-center text-sm text-muted-foreground">
                  Loading wallets...
                </div>
              ) : wallets.length === 0 ? (
                <div className="h-10 flex items-center text-sm text-muted-foreground">
                  No wallets available. Create a wallet first.
                </div>
              ) : (
                <Select
                  value={formData.walletId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, walletId: value }))}
                  disabled={submitting}
                >
                  <SelectTrigger id="wallet">
                    <SelectValue placeholder="Select a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.chain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                disabled={submitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || wallets.length === 0}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Intent'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
