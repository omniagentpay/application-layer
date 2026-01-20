import { motion } from 'framer-motion';
import { ArrowRight, Zap, Globe, Link2, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteVisualizationProps {
  sourceChain: string;
  destChain: string;
  routeType: 'auto' | 'cctp' | 'gateway' | 'bridge';
  className?: string;
}

const routeIcons = {
  auto: Zap,
  cctp: Globe,
  gateway: Link2,
  bridge: Box,
};

const routeColors = {
  auto: 'text-purple-500',
  cctp: 'text-blue-500',
  gateway: 'text-green-500',
  bridge: 'text-amber-500',
};

const routeBgColors = {
  auto: 'bg-purple-500/10 border-purple-500/20',
  cctp: 'bg-blue-500/10 border-blue-500/20',
  gateway: 'bg-green-500/10 border-green-500/20',
  bridge: 'bg-amber-500/10 border-amber-500/20',
};

export function RouteVisualization({ sourceChain, destChain, routeType, className }: RouteVisualizationProps) {
  const RouteIcon = routeIcons[routeType];
  
  return (
    <div className={cn("relative p-6 rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-md border", routeBgColors[routeType])}>
            <RouteIcon className={cn("h-4 w-4", routeColors[routeType])} />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {routeType}
          </span>
        </div>
      </div>
      
      {/* Route Flow */}
      <div className="flex items-center justify-between relative">
        {/* Source Chain */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center ring-2 ring-primary/10">
            <span className="text-xs font-semibold text-primary">
              {sourceChain.slice(0, 3).toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-medium text-foreground capitalize">
            {sourceChain}
          </span>
        </motion.div>

        {/* Animated Path */}
        <div className="flex-1 relative mx-4 h-0.5">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary via-primary/50 to-primary"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ transformOrigin: "left" }}
          />
          
          {/* Animated particles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 w-2 h-2 bg-primary rounded-full -translate-y-1/2"
              initial={{ left: "0%", opacity: 0 }}
              animate={{ 
                left: "100%", 
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* Destination Chain */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center ring-2 ring-success/10">
            <span className="text-xs font-semibold text-success">
              {destChain.slice(0, 3).toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-medium text-foreground capitalize">
            {destChain}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
