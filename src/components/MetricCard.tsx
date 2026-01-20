import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: number; // 0-100 for circular progress
  chart?: ReactNode; // Custom chart component (replaces icon/progress)
  bottomContent?: ReactNode; // Content to render below value (e.g., micro-charts)
  className?: string;
}

export function MetricCard({ label, value, subValue, icon: Icon, trend, progress, chart, bottomContent, className }: MetricCardProps) {
  const circumference = 2 * Math.PI * 18; // radius = 18
  const offset = progress !== undefined ? circumference - (progress / 100) * circumference : 0;

  return (
    <div className={cn('metric-card relative flex flex-col overflow-hidden h-full', className)}>
      {/* ZONE 1: Header (fixed height) - Title + Icon */}
      <div className="flex items-center justify-between mb-3 min-h-[20px]">
        <p className="metric-label flex-1 min-w-0 pr-2">{label}</p>
        {Icon && !chart && (
          <div className="p-2 rounded-lg bg-muted shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* ZONE 2: Body (primary value + chart/icon) - Fixed baseline alignment */}
      <div className="flex items-start gap-4 mb-3 min-h-[60px]">
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="metric-value leading-none">{value}</p>
        </div>
        {chart && (
          <div className="shrink-0 w-[100px] h-[100px] flex items-center justify-center overflow-hidden">
            {chart}
          </div>
        )}
        {progress !== undefined && !chart && (
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="transform -rotate-90 w-12 h-12">
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="text-primary transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xs font-medium text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>

      {/* ZONE 3: Footer (secondary/meta text - wrap-safe) */}
      <div className="space-y-1 min-h-[20px] overflow-hidden">
        {subValue && (
          <p className="text-sm text-muted-foreground break-words overflow-wrap-anywhere">{subValue}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <span className={trend.isPositive ? 'text-success' : 'text-destructive'}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-muted-foreground">from last period</span>
          </div>
        )}
        {bottomContent && (
          <div className="mt-2 overflow-hidden">
            {bottomContent}
          </div>
        )}
      </div>
    </div>
  );
}
