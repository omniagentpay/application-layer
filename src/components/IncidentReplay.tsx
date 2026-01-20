import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlayCircle, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IncidentReplayResult } from '@/types';
import { paymentsService } from '@/services/payments';
import { formatDistanceToNow } from 'date-fns';

interface IncidentReplayProps {
  intentId: string;
  className?: string;
}

export function IncidentReplay({ intentId, className }: IncidentReplayProps) {
  const [result, setResult] = useState<IncidentReplayResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReplay = async () => {
    setLoading(true);
    try {
      const data = await paymentsService.replayIncident(intentId);
      setResult(data);
    } catch (error) {
      console.error('Replay failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Incident Replay</CardTitle>
        <CardDescription>Re-run simulation and guard evaluation with current rules</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleReplay} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Replaying...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Replay Transaction
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4 pt-4 border-t">
            {/* Original Result */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Original Result
              </h3>
              <div
                className={cn(
                  'p-3 rounded border',
                  result.originalResult.allowed
                    ? 'bg-success/10 border-success/20'
                    : 'bg-destructive/10 border-destructive/20'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {result.originalResult.allowed ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <Badge
                    variant={result.originalResult.allowed ? 'default' : 'destructive'}
                    className={cn(
                      result.originalResult.allowed
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    )}
                  >
                    {result.originalResult.allowed ? 'Allowed' : 'Blocked'}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(result.originalResult.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {result.originalResult.guardResults.filter((g) => g.passed).length} of{' '}
                  {result.originalResult.guardResults.length} guards passed
                </p>
              </div>
            </div>

            {/* Current Result */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Current Result</h3>
              <div
                className={cn(
                  'p-3 rounded border',
                  result.currentResult.allowed
                    ? 'bg-success/10 border-success/20'
                    : 'bg-destructive/10 border-destructive/20'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {result.currentResult.allowed ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <Badge
                    variant={result.currentResult.allowed ? 'default' : 'destructive'}
                    className={cn(
                      result.currentResult.allowed
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    )}
                  >
                    {result.currentResult.allowed ? 'Allowed' : 'Blocked'}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">Now</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {result.currentResult.guardResults.filter((g) => g.passed).length} of{' '}
                  {result.currentResult.guardResults.length} guards passed
                </p>
              </div>
            </div>

            {/* Differences */}
            {result.differences.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Changes Detected</h3>
                <div className="space-y-2">
                  {result.differences.map((diff, idx) => {
                    if (diff.original === diff.current) return null;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded border bg-warning/5 border-warning/20"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{diff.guardName}</p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={diff.original ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              Was: {diff.original ? 'Pass' : 'Fail'}
                            </Badge>
                            <span className="text-xs">→</span>
                            <Badge
                              variant={diff.current ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              Now: {diff.current ? 'Pass' : 'Fail'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{diff.reason}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result.differences.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No changes detected. Result would be the same today.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
