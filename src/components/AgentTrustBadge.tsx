import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent, AgentRiskTier, TrustLevel } from '@/types';

interface AgentTrustBadgeProps {
  agent: Agent;
  showScore?: boolean;
  className?: string;
}

const trustIcons = {
  trusted: ShieldCheck,
  verified: Shield,
  new: Shield,
  flagged: ShieldAlert,
};

const trustColors = {
  trusted: 'bg-success/10 text-success border-success/30 dark:bg-success/20 dark:border-success/40',
  verified: 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:border-primary/40',
  new: 'bg-muted text-muted-foreground border-border',
  flagged: 'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20 dark:border-destructive/40',
};

const riskTierLabels = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical Risk',
};

export function AgentTrustBadge({ agent, showScore = false, className }: AgentTrustBadgeProps) {
  const Icon = trustIcons[agent.trustLevel] || Shield;
  const trustColor = trustColors[agent.trustLevel] || trustColors.new;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant="outline" className={cn('flex items-center gap-1.5', trustColor)}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium capitalize">{agent.trustLevel}</span>
      </Badge>
      {showScore && (
        <span className="text-xs text-muted-foreground">
          Score: {agent.spendReputationScore}/100
        </span>
      )}
      <Badge variant="outline" className="text-xs">
        {riskTierLabels[agent.riskTier]}
      </Badge>
    </div>
  );
}
