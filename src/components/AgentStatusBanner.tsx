import { CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AgentStatusBannerProps {
  agentsRequiringAttention: number;
  className?: string;
}

export function AgentStatusBanner({ agentsRequiringAttention, className }: AgentStatusBannerProps) {
  const isHealthy = agentsRequiringAttention === 0;
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
      className={cn(
        'rounded-lg border px-4 py-3 mb-6',
        isHealthy
          ? 'bg-success/5 border-success/20'
          : 'bg-warning/5 border-warning/20',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeOut", delay: 0.1 }}
        >
          {isHealthy ? (
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
          )}
        </motion.div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isHealthy
              ? 'All agents operating within guardrails'
              : `${agentsRequiringAttention} agent${agentsRequiringAttention > 1 ? 's' : ''} require${agentsRequiringAttention === 1 ? 's' : ''} attention`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHealthy
              ? 'Payment operations are running smoothly with all guard policies active'
              : 'Review pending approvals or flagged agents to maintain operational safety'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
