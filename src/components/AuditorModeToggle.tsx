import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditorModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export function AuditorModeToggle({ enabled, onToggle, className }: AuditorModeToggleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {enabled ? (
        <Eye className="h-4 w-4 text-muted-foreground" />
      ) : (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      )}
      <Label htmlFor="auditor-mode" className="text-sm cursor-pointer">
        Auditor Mode
      </Label>
      <Switch
        id="auditor-mode"
        checked={enabled}
        onCheckedChange={onToggle}
        aria-label="Toggle auditor mode"
      />
      {enabled && (
        <span className="text-xs text-muted-foreground">(Read-only)</span>
      )}
    </div>
  );
}
