import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface SpendTrendChartProps {
  data: Array<{ time: string; value: number }>;
  className?: string;
  showFullChart?: boolean;
}

export function SpendTrendChart({ data, className, showFullChart = false }: SpendTrendChartProps) {
  // Check if all values are zero or no meaningful data
  const hasData = data && data.length > 0 && data.some(d => d.value > 0);
  const allZero = data && data.length > 0 && data.every(d => d.value === 0);

  // If no data or all zeros, show empty state with message
  if (!hasData && !showFullChart) {
    return (
      <div className={`h-12 flex flex-col items-center justify-center ${className}`}>
        <div className="h-0.5 w-full bg-muted/30 rounded-full mb-1" />
        <span className="text-xs text-muted-foreground">No agent spend detected today</span>
      </div>
    );
  }

  // Ensure smooth variation even with sparse data
  const normalizedData = data.map((d, i) => ({
    ...d,
    value: d.value || 0,
  }));

  // For full chart view, use AreaChart with more features
  if (showFullChart) {
    const maxValue = Math.max(...normalizedData.map(d => d.value), 1);
    const gradientId = 'spendGradient';
    
    return (
      <div className={`w-full ${className}`}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={normalizedData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.2} />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
                      <p className="text-muted-foreground text-xs mb-1">{payload[0].payload.time}</p>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        ${Number(payload[0].value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
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

  // Compact view for metric cards
  return (
    <div className={`h-12 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={normalizedData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-card border border-border rounded-md px-2 py-1 text-xs shadow-sm">
                    <p className="text-muted-foreground">{payload[0].payload.time}</p>
                    <p className="font-medium">${Number(payload[0].value || 0).toLocaleString()}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
