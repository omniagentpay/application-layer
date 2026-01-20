import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { LoadingSkeleton } from './LoadingSkeleton';
import { CopyButton } from './CopyButton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentExplanation } from '@/types';
import { paymentsService } from '@/services/payments';

interface ExplainPaymentDrawerProps {
  intentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExplainPaymentDrawer({ intentId, open, onOpenChange }: ExplainPaymentDrawerProps) {
  const [explanation, setExplanation] = useState<PaymentExplanation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && intentId) {
      loadExplanation();
    }
  }, [open, intentId]);

  const loadExplanation = async () => {
    setLoading(true);
    try {
      const data = await paymentsService.getExplanation(intentId);
      setExplanation(data);
    } catch (error) {
      console.error('Failed to load explanation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Explain This Payment</SheetTitle>
          <SheetDescription>Deterministic explanation of payment decision and routing</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-6">
            <LoadingSkeleton variant="card" count={3} />
          </div>
        ) : explanation ? (
          <div className="mt-6 space-y-6">
            {/* Initiated By */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Initiated By</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Agent:</span>{' '}
                  <span className="font-medium">{explanation.initiatedBy.agentName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tool:</span>{' '}
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{explanation.initiatedBy.toolName}</code>
                </div>
                <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mt-2">
                  {JSON.stringify(explanation.initiatedBy.toolInput, null, 2)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Why It Happened */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Why It Happened</h3>
              <p className="text-sm text-muted-foreground">{explanation.reason}</p>
            </div>

            <Separator />

            {/* Decision */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Decision</h3>
              <div className="flex items-center gap-2 mb-3">
                {explanation.decision.allowed ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <Badge
                  variant={explanation.decision.allowed ? 'default' : 'destructive'}
                  className={cn(
                    explanation.decision.allowed
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  )}
                >
                  {explanation.decision.allowed ? 'Allowed' : 'Blocked'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{explanation.decision.reason}</p>
              {explanation.decision.blockingGuards && explanation.decision.blockingGuards.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Blocking Guards:</p>
                  {explanation.decision.blockingGuards.map((guard, idx) => (
                    <div key={idx} className="text-xs bg-destructive/10 border border-destructive/20 rounded p-2">
                      <span className="font-medium">{guard.name}</span>
                      <p className="text-muted-foreground mt-0.5">{guard.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Route */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Route Chosen</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Protocol:</span>{' '}
                  <Badge variant="outline" className="ml-2">
                    {explanation.route.chosen.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{explanation.route.explanation}</p>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Estimated Time</span>
                    <p className="text-sm font-medium">{explanation.route.estimatedTime}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Estimated Fee</span>
                    <p className="text-sm font-medium">${explanation.route.estimatedFee}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Conditions That Would Block */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Conditions That Would Block
              </h3>
              <div className="space-y-2">
                {explanation.conditions.wouldBlock.map((condition, idx) => (
                  <div key={idx} className="text-sm bg-muted/50 border rounded p-3">
                    <p className="font-medium mb-1">{condition.condition}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Current: {condition.currentValue}</span>
                      <span>•</span>
                      <span>Threshold: {condition.threshold}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Failed to load explanation
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
