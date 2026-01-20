import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ChainDistributionChartProps {
  data: Array<{ chain: string; value: number; amount: number }>;
  className?: string;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: 'hsl(220, 70%, 50%)',
  polygon: 'hsl(260, 70%, 50%)',
  base: 'hsl(200, 70%, 50%)',
  arbitrum: 'hsl(280, 70%, 50%)',
  optimism: 'hsl(15, 70%, 50%)',
  avalanche: 'hsl(0, 70%, 50%)',
};

export function ChainDistributionChart({ data, className }: ChainDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`h-64 flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">No chain data available</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ chain, percent }) => `${chain}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={CHAIN_COLORS[entry.chain.toLowerCase()] || `hsl(${index * 60}, 70%, 50%)`} 
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
                    <p className="font-semibold">{data.chain}</p>
                    <p className="text-muted-foreground">
                      {data.value} transactions
                    </p>
                    <p className="text-muted-foreground">
                      ${data.amount.toLocaleString()} total
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
