import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, Bot, Wrench, PlayCircle, Shield, CheckCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types';
import { paymentsService } from '@/services/payments';
import { LoadingSkeleton } from './LoadingSkeleton';

interface PaymentTimelineProps {
  intentId: string;
  className?: string;
}

const eventIcons = {
  agent_action: Bot,
  tool_invocation: Wrench,
  simulate: PlayCircle,
  guard_evaluation: Shield,
  approval_decision: CheckCheck,
  pay_execution: Zap,
};

const eventColors = {
  agent_action: 'text-primary dark:text-primary',
  tool_invocation: 'text-purple-500 dark:text-purple-400',
  simulate: 'text-cyan-500 dark:text-cyan-400',
  guard_evaluation: 'text-amber-500 dark:text-amber-400',
  approval_decision: 'text-success dark:text-success',
  pay_execution: 'text-success dark:text-success',
};

export function PaymentTimeline({ intentId, className }: PaymentTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [intentId]);

  const loadTimeline = async () => {
    try {
      const data = await paymentsService.getTimeline(intentId);
      setTimeline(data);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="card" count={1} className={className} />;
  }

  if (timeline.length === 0) {
    return (
      <div className={cn('text-center py-8 text-sm text-muted-foreground', className)}>
        No timeline events available
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {timeline.map((event, idx) => {
        const Icon = eventIcons[event.type] || Clock;
        const isLast = idx === timeline.length - 1;
        const statusColor =
          event.status === 'success'
            ? 'text-success'
            : event.status === 'failed' || event.status === 'blocked'
            ? 'text-destructive'
            : 'text-muted-foreground';

        return (
          <div key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center border-2',
                  event.status === 'success'
                    ? 'bg-success/10 border-success'
                    : event.status === 'failed' || event.status === 'blocked'
                    ? 'bg-destructive/10 border-destructive'
                    : 'bg-muted border-muted-foreground'
                )}
              >
                {event.status === 'success' ? (
                  <CheckCircle className={cn('h-5 w-5', statusColor)} />
                ) : event.status === 'failed' || event.status === 'blocked' ? (
                  <XCircle className={cn('h-5 w-5', statusColor)} />
                ) : (
                  <Loader2 className={cn('h-5 w-5 animate-spin', statusColor)} />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-px flex-1 mt-2 min-h-[60px]',
                    event.status === 'success' ? 'bg-success/30' : 'bg-border'
                  )}
                />
              )}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-start gap-2 mb-1">
                <Icon className={cn('h-4 w-4 mt-0.5', eventColors[event.type])} />
                <div className="flex-1">
                  <p className={cn('text-sm font-medium', event.status === 'pending' && 'text-muted-foreground')}>
                    {event.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                  {event.details && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {event.details.agentName && (
                        <p>
                          <span className="font-medium">Agent:</span> {event.details.agentName}
                        </p>
                      )}
                      {event.details.toolName && (
                        <p>
                          <span className="font-medium">Tool:</span> {event.details.toolName}
                        </p>
                      )}
                      {event.details.guardName && (
                        <p>
                          <span className="font-medium">Guard:</span> {event.details.guardName}
                          {event.details.guardReason && ` - ${event.details.guardReason}`}
                        </p>
                      )}
                      {event.details.route && (
                        <p>
                          <span className="font-medium">Route:</span> {event.details.route}
                        </p>
                      )}
                      {event.details.estimatedFee !== undefined && (
                        <p>
                          <span className="font-medium">Fee:</span> ${event.details.estimatedFee}
                        </p>
                      )}
                      {event.details.txHash && (
                        <p className="font-mono text-xs">
                          <span className="font-medium">Tx:</span> {event.details.txHash.substring(0, 16)}...
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
