import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CheckCircle2, XCircle } from 'lucide-react';

interface SuccessRateDonutProps {
  successRate: number;
  totalExecutions: number;
  className?: string;
  showFullChart?: boolean;
}

export function SuccessRateDonut({ successRate, totalExecutions, className, showFullChart = false }: SuccessRateDonutProps) {
  const hasData = totalExecutions > 0;

  // Don't show the donut chart if there's no data - return empty decorative element
  if (!hasData && !showFullChart) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-muted/30" />
        </div>
      </div>
    );
  }

  const successValue = hasData ? successRate : 0;
  const failureValue = hasData ? Math.max(0, 100 - successRate) : 0;

  const data = [
    { name: 'Success', value: successValue, fill: 'hsl(var(--success))' },
    { name: 'Failed', value: failureValue, fill: 'hsl(var(--destructive))' },
  ];

  // Full chart view
  if (showFullChart) {
    return (
      <div className={`w-full ${className}`}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
                      <p className="font-semibold flex items-center gap-2">
                        {data.name === 'Success' ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        {data.name}
                      </p>
                      <p className="text-muted-foreground">
                        {data.value.toFixed(1)}% ({totalExecutions > 0 
                          ? Math.round((data.value / 100) * totalExecutions)
                          : 0
                        } {data.name === 'Success' ? 'succeeded' : 'failed'})
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Compact view for metric cards
  return (
    <div className={`relative ${className}`}>
      <ResponsiveContainer width="100%" height={100}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={32}
            outerRadius={40}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.fill} 
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
