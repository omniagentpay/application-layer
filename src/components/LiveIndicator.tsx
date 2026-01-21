import { cn } from '@/lib/utils';

interface LiveIndicatorProps {
  className?: string;
}

export function LiveIndicator({ className }: LiveIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Live</span>
        <div className="relative h-2.5 w-2.5">
          {/* Blinking dot */}
          <span className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          {/* Pulsing ring effect */}
          <span className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 opacity-75 animate-ping" />
        </div>
      </div>
    </div>
  );
}
