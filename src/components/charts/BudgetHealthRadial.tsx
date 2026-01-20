import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface BudgetHealthRadialProps {
  used: number;
  remaining: number;
  threshold: number; // Auto-approval threshold
  total: number;
  className?: string;
  showFullChart?: boolean;
}

export function BudgetHealthRadial({ used, remaining, threshold, total, className, showFullChart = false }: BudgetHealthRadialProps) {
  const usedPercent = (used / total) * 100;
  const thresholdPercent = (threshold / total) * 100;
  
  // Determine color based on usage vs threshold
  let fillColor = 'hsl(var(--success))'; // Safe (green)
  if (usedPercent >= thresholdPercent) {
    fillColor = 'hsl(var(--destructive))'; // Over threshold (red)
  } else if (usedPercent >= thresholdPercent * 0.8) {
    fillColor = 'hsl(var(--warning))'; // Approaching threshold (yellow)
  }

  // Create data: used portion and remaining portion
  const data = [
    {
      name: 'Used',
      value: usedPercent,
      fill: fillColor,
    },
    {
      name: 'Remaining',
      value: Math.max(0, 100 - usedPercent),
      fill: 'hsl(var(--muted))',
    },
  ];

  // Full chart view with legend
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
                      <p className="font-semibold">{data.name}</p>
                      <p className="text-muted-foreground">
                        {data.name === 'Used' 
                          ? `$${used.toLocaleString()} (${data.value.toFixed(1)}%)`
                          : `$${remaining.toLocaleString()} (${data.value.toFixed(1)}%)`
                        }
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
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
