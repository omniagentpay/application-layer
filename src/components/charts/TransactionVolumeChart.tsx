import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface TransactionVolumeChartProps {
  data: Array<{ time: string; succeeded: number; failed: number; pending: number }>;
  className?: string;
}

export function TransactionVolumeChart({ data, className }: TransactionVolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`h-64 flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">No transaction data available</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
                    <p className="text-muted-foreground text-xs mb-2 font-medium">{data.time}</p>
                    <div className="space-y-1">
                      {data.succeeded > 0 && (
                        <p className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-success"></span>
                          <span>Succeeded: {data.succeeded}</span>
                        </p>
                      )}
                      {data.failed > 0 && (
                        <p className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-destructive"></span>
                          <span>Failed: {data.failed}</span>
                        </p>
                      )}
                      {data.pending > 0 && (
                        <p className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-warning"></span>
                          <span>Pending: {data.pending}</span>
                        </p>
                      )}
                      <p className="pt-1 border-t border-border mt-1 font-semibold">
                        Total: {data.succeeded + data.failed + data.pending}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
            formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
          />
          <Bar dataKey="succeeded" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
          <Bar dataKey="failed" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} />
          <Bar dataKey="pending" stackId="a" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
