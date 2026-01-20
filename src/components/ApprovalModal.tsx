import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalRequest, ApprovalAction } from '@/types';

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ApprovalRequest | null;
  onApprove: (action: ApprovalAction) => Promise<void>;
}

export function ApprovalModal({ open, onOpenChange, request, onApprove }: ApprovalModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ApprovalAction | null>(null);

  if (!request) return null;

  const handleAction = async (action: ApprovalAction) => {
    setLoading(true);
    setSelectedAction(action);
    try {
      await onApprove(action);
      onOpenChange(false);
    } catch (error) {
      console.error('Approval action failed:', error);
    } finally {
      setLoading(false);
      setSelectedAction(null);
    }
  };

  const allGuardsPassed = request.guardChecks.every((g) => g.passed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve Payment</DialogTitle>
          <DialogDescription>Review payment details and guard checks before approval</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Amount</h3>
            <p className="text-2xl font-bold">${request.amount.toLocaleString()}</p>
          </div>

          <Separator />

          {/* Justification */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Justification</h3>
            <p className="text-sm text-muted-foreground">{request.justification}</p>
          </div>

          <Separator />

          {/* Guard Checks */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Guard Checks
            </h3>
            <div className="space-y-2">
              {request.guardChecks.map((guard, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center justify-between p-3 rounded border',
                    guard.passed ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {guard.passed ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{guard.guardName}</p>
                      {guard.reason && (
                        <p className="text-xs text-muted-foreground">{guard.reason}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={guard.passed ? 'default' : 'destructive'}
                    className={cn(
                      guard.passed
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    )}
                  >
                    {guard.passed ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
              ))}
            </div>
            {!allGuardsPassed && (
              <p className="text-xs text-destructive mt-2">
                Some guard checks failed. Payment may be blocked.
              </p>
            )}
          </div>

          <Separator />

          {/* Route Details */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Route Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Protocol</span>
                <p className="font-medium mt-0.5">
                  <Badge variant="outline">{request.routeDetails.route.toUpperCase()}</Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Estimated Fee</span>
                <p className="font-medium mt-0.5">${request.routeDetails.estimatedFee}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Estimated Time</span>
                <p className="font-medium mt-0.5">{request.routeDetails.estimatedTime}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleAction('deny')}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Deny & Update Guard
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAction('approve_similar_24h')}
            disabled={loading || selectedAction !== null}
            className="w-full sm:w-auto"
          >
            <Clock className="h-4 w-4 mr-2" />
            Approve Similar (24h)
          </Button>
          <Button
            onClick={() => handleAction('approve_once')}
            disabled={loading || selectedAction !== null}
            className="w-full sm:w-auto"
          >
            {loading && selectedAction === 'approve_once' ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Once
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
