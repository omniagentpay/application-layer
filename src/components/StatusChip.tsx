import { cn } from '@/lib/utils';

type StatusType = 'succeeded' | 'pending' | 'failed' | 'blocked' | 'simulating' | 'awaiting_approval' | 'executing' | 'active' | 'inactive' | 'bridging' | 'confirming' | 'completed';

interface StatusChipProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  succeeded: { label: 'Succeeded', className: 'status-succeeded' },
  completed: { label: 'Completed', className: 'status-succeeded' },
  pending: { label: 'Pending', className: 'status-pending' },
  failed: { label: 'Failed', className: 'status-failed' },
  blocked: { label: 'Blocked', className: 'status-blocked' },
  simulating: { label: 'Simulating', className: 'status-pending' },
  awaiting_approval: { label: 'Awaiting Approval', className: 'status-pending' },
  executing: { label: 'Executing', className: 'status-pending' },
  bridging: { label: 'Bridging', className: 'status-pending' },
  confirming: { label: 'Confirming', className: 'status-pending' },
  active: { label: 'Active', className: 'status-succeeded' },
  inactive: { label: 'Inactive', className: 'status-blocked' },
};

export function StatusChip({ status, className }: StatusChipProps) {
  const config = statusConfig[status] || { label: status, className: 'status-blocked' };
  
  return (
    <span className={cn('status-chip', config.className, className)}>
      {config.label}
    </span>
  );
}
