import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Upload, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { paymentsService } from '@/services/payments';
import { StatusChip } from '@/components/StatusChip';

interface ParsedInvoice {
  vendorName: string;
  vendorId?: string;
  amount: number;
  currency: string;
  memo: string;
  confidence: number;
  extractedFields: Record<string, unknown>;
}

export function InvoicePaymentCard({ onIntentCreated }: { onIntentCreated?: () => void }) {
  const { toast } = useToast();
  const [invoiceText, setInvoiceText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvoice | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [createdIntent, setCreatedIntent] = useState<{ intentId: string; status: string } | null>(null);

  const handleParseInvoice = async () => {
    if (!invoiceText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter invoice text',
        variant: 'destructive',
      });
      return;
    }

    setParsing(true);
    try {
      const result = await apiClient.post<ParsedInvoice>('/invoice/parse', { text: invoiceText });
      setParsedData(result);
      toast({
        title: 'Success',
        description: 'Invoice parsed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to parse invoice',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  const handleCreateIntent = async () => {
    if (!parsedData) return;

    setCreatingIntent(true);
    try {
      const result = await apiClient.post<{ intentId: string; status: string; guardDecision: unknown[]; createdAt: string }>(
        '/invoice/intents/create',
        {
          amount: parsedData.amount,
          token: parsedData.currency,
          target: parsedData.vendorId || parsedData.vendorName,
          memo: parsedData.memo,
          source: 'invoice',
          extractedFields: parsedData.extractedFields,
        }
      );
      
      setCreatedIntent({ intentId: result.intentId, status: result.status });
      toast({
        title: 'Success',
        description: 'Payment intent created successfully',
      });
      
      if (onIntentCreated) {
        onIntentCreated();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create intent',
        variant: 'destructive',
      });
    } finally {
      setCreatingIntent(false);
    }
  };

  const handleApprove = async () => {
    if (!createdIntent) return;
    
    try {
      await paymentsService.approveIntent(createdIntent.intentId);
      setCreatedIntent({ ...createdIntent, status: 'approved' });
      toast({
        title: 'Success',
        description: 'Intent approved',
      });
      if (onIntentCreated) {
        onIntentCreated();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve intent',
        variant: 'destructive',
      });
    }
  };

  const handleExecute = async () => {
    if (!createdIntent) return;
    
    try {
      const result = await paymentsService.executeIntent(createdIntent.intentId);
      if (result.success) {
        setCreatedIntent({ ...createdIntent, status: 'executed' });
        toast({
          title: 'Success',
          description: 'Payment executed successfully',
        });
        if (onIntentCreated) {
          onIntentCreated();
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to execute payment',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Pay an Invoice
        </CardTitle>
        <CardDescription>
          Upload or paste invoice text to create a payment intent automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invoice-text">Invoice Text</Label>
          <Textarea
            id="invoice-text"
            placeholder="Paste invoice text here... (e.g., Invoice from Acme Corp, Amount: $1,234.56)"
            value={invoiceText}
            onChange={(e) => setInvoiceText(e.target.value)}
            rows={4}
            disabled={parsing || creatingIntent}
          />
        </div>

        <Button
          onClick={handleParseInvoice}
          disabled={parsing || !invoiceText.trim()}
          className="w-full"
        >
          {parsing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Parse Invoice
            </>
          )}
        </Button>

        {parsedData && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Parsed Invoice</span>
                <Badge variant={parsedData.confidence > 0.8 ? 'default' : 'secondary'}>
                  {Math.round(parsedData.confidence * 100)}% confidence
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <p className="font-medium">{parsedData.vendorName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium">{parsedData.currency} {parsedData.amount.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Memo:</span>
                  <p className="font-medium">{parsedData.memo}</p>
                </div>
              </div>

              <Button
                onClick={handleCreateIntent}
                disabled={creatingIntent}
                className="w-full"
              >
                {creatingIntent ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Intent...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Create Intent
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {createdIntent && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payment Intent</span>
                <StatusChip status={createdIntent.status} />
              </div>
              
              <div className="text-xs font-mono text-muted-foreground break-all">
                {createdIntent.intentId}
              </div>

              <div className="flex gap-2">
                {(createdIntent.status === 'requires_approval' || createdIntent.status === 'awaiting_approval') && (
                  <Button
                    onClick={handleApprove}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {(createdIntent.status === 'approved' || createdIntent.status === 'executing') && (
                  <Button
                    onClick={handleExecute}
                    size="sm"
                    className="flex-1"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Execute
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
