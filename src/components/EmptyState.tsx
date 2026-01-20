import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon, FileQuestion, Inbox, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error';
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  variant = 'default',
  className 
}: EmptyStateProps) {
  const DefaultIcon = variant === 'search' ? Search : variant === 'error' ? AlertCircle : Inbox;
  const DisplayIcon = Icon || DefaultIcon;
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeOut", delay: 0.1 }}
        className={cn(
          "p-4 rounded-full mb-6 transition-all duration-200",
          variant === 'error' ? "bg-destructive/10" : variant === 'search' ? "bg-info/10" : "bg-muted/50"
        )}
      >
        <DisplayIcon className={cn(
          "h-10 w-10",
          variant === 'error' ? "text-destructive" : variant === 'search' ? "text-info" : "text-muted-foreground"
        )} />
      </motion.div>
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
