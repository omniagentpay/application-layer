import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, Area, AreaChart } from 'recharts';
import { Activity } from 'lucide-react';

interface ActivitySparklineProps {
  data: Array<{ time: string; count: number }>;
  className?: string;
  showFullChart?: boolean;
}

export function ActivitySparkline({ data, className, showFullChart = false }: ActivitySparklineProps) {
  // If no data, show minimal placeholder
  if (!data || data.length === 0) {
    return (
      <div className={`h-8 flex items-center ${className}`}>
        <div className="h-0.5 w-full bg-muted/30 rounded-full" />
      </div>
    );
  }

  // Ensure we have some variation for visual interest
  const hasActivity = data.some(d => d.count > 0);

  // Full chart view
  if (showFullChart) {
    const gradientId = 'activityGradient';
    
    return (
      <div className={`w-full ${className}`}>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
                      <p className="text-muted-foreground text-xs mb-1">{payload[0].payload.time}</p>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {payload[0].value} {Number(payload[0].value) === 1 ? 'transaction' : 'transactions'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{ fill: 'hsl(var(--primary))', r: 3 }}
              activeDot={{ r: 5, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Compact sparkline view
  return (
    <div className={`h-8 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
