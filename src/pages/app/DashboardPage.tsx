import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusChip } from '@/components/StatusChip';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { AgentStatusBanner } from '@/components/AgentStatusBanner';
import { SpendTrendChart } from '@/components/charts/SpendTrendChart';
import { BudgetHealthRadial } from '@/components/charts/BudgetHealthRadial';
import { SuccessRateDonut } from '@/components/charts/SuccessRateDonut';
import { ActivitySparkline } from '@/components/charts/ActivitySparkline';
import { TransactionVolumeChart } from '@/components/charts/TransactionVolumeChart';
import { ChainDistributionChart } from '@/components/charts/ChainDistributionChart';
import { 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  AlertCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Zap,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import type { PaymentIntent, Transaction } from '@/types';
import { useDashboardData } from '@/hooks/useDashboard';

export default function DashboardPage() {
  const { user, authenticated } = usePrivy();
  const { data, isLoading } = useDashboardData(user, authenticated);

  // Memoize all computed values to avoid recalculating on every render
  const pendingIntents = useMemo(() => {
    return data?.intents.filter(i => i.status === 'awaiting_approval') || [];
  }, [data?.intents]);

  const agentsRequiringAttention = useMemo(() => {
    if (!data) return 0;
    const flaggedAgents = data.agents.filter(a => a.trustLevel === 'flagged').length;
    const agentsWithPendingApprovals = new Set(
      pendingIntents.filter(i => i.agentId).map(i => i.agentId!)
    ).size;
    return Math.max(flaggedAgents, agentsWithPendingApprovals);
  }, [data?.agents, pendingIntents]);

  const recentTransactions = useMemo(() => {
    return data?.transactions.slice(0, 5) || [];
  }, [data?.transactions]);

  const metrics = useMemo(() => {
    if (!data) {
      return {
        spendToday: 0,
        remainingBudget: 0,
        successRate: 0,
        activeWallets: 0,
        pendingApprovals: 0,
        totalTransactions: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTxs = data.transactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate >= today && tx.status === 'succeeded';
    });
    const spendToday = todayTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const successCount = data.transactions.filter(tx => tx.status === 'succeeded').length;
    const successRate = data.transactions.length > 0 ? (successCount / data.transactions.length) * 100 : 0;

    return {
      spendToday,
      remainingBudget: Math.max(0, 3000 - spendToday),
      successRate: Math.round(successRate * 10) / 10,
      activeWallets: data.wallets.filter(w => w.status === 'active').length,
      pendingApprovals: pendingIntents.length,
      totalTransactions: data.transactions.length,
    };
  }, [data, pendingIntents.length]);

  const spendTrendData = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const trendData: Array<{ time: string; value: number }> = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now);
      hour.setHours(now.getHours() - i, 0, 0, 0);
      const hourTxs = data.transactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= hour && txDate < new Date(hour.getTime() + 3600000) && tx.status === 'succeeded';
      });
      const hourSpend = hourTxs.reduce((sum, tx) => sum + tx.amount, 0);
      trendData.push({
        time: hour.getHours().toString().padStart(2, '0') + ':00',
        value: hourSpend,
      });
    }
    return trendData;
  }, [data?.transactions]);

  const activitySparklineData = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const sparklineData: Array<{ time: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const dayTxs = data.transactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= day && txDate < nextDay;
      });
      sparklineData.push({
        time: day.toLocaleDateString('en-US', { weekday: 'short' }),
        count: dayTxs.length,
      });
    }
    return sparklineData;
  }, [data?.transactions]);

  const transactionVolumeData = useMemo(() => {
    if (!data) return [];
    const volumeData: Array<{ time: string; succeeded: number; failed: number; pending: number }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const dayTxs = data.transactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= day && txDate < nextDay;
      });
      volumeData.push({
        time: day.toLocaleDateString('en-US', { weekday: 'short' }),
        succeeded: dayTxs.filter(tx => tx.status === 'succeeded').length,
        failed: dayTxs.filter(tx => tx.status === 'failed').length,
        pending: dayTxs.filter(tx => tx.status === 'pending').length,
      });
    }
    return volumeData;
  }, [data?.transactions]);

  const chainDistributionData = useMemo(() => {
    if (!data) return [];
    const chainMap = new Map<string, { count: number; amount: number }>();
    data.transactions.forEach(tx => {
      if (tx.status === 'succeeded') {
        const chain = tx.chain || 'unknown';
        const existing = chainMap.get(chain) || { count: 0, amount: 0 };
        chainMap.set(chain, {
          count: existing.count + 1,
          amount: existing.amount + tx.amount,
        });
      }
    });
    
    return Array.from(chainMap.entries()).map(([chain, chainData]) => ({
      chain: chain.charAt(0).toUpperCase() + chain.slice(1),
      value: chainData.count,
      amount: chainData.amount,
    }));
  }, [data?.transactions]);

  // Memoize micro-events generation
  const microEvents = useMemo(() => {
    const events: Array<{ id: string; type: string; message: string; timestamp: Date }> = [];
    
    // Add events from recent transactions
    recentTransactions.slice(0, 3).forEach((tx) => {
      if (tx.type === 'payment') {
        events.push({
          id: `event_${tx.id}_payment`,
          type: 'payment',
          message: 'Agent simulated payment',
          timestamp: new Date(tx.createdAt),
        });
      }
    });

    // Add guard events from pending intents
    pendingIntents.slice(0, 2).forEach((intent) => {
      const allGuardsPassed = intent.guardResults.length > 0 && intent.guardResults.every(r => r.passed);
      if (allGuardsPassed) {
        events.push({
          id: `event_${intent.id}_guard`,
          type: 'guard',
          message: 'Guard auto-approved',
          timestamp: new Date(intent.updatedAt),
        });
      }
      if (intent.route) {
        events.push({
          id: `event_${intent.id}_route`,
          type: 'route',
          message: `Route selected: ${intent.route.toUpperCase()}`,
          timestamp: new Date(intent.updatedAt),
        });
      }
    });

    // Sort by timestamp and take most recent 5
    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  }, [recentTransactions, pendingIntents]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your payment operations" />
        <LoadingSkeleton variant="metric" count={4} className="mb-6" />
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  const hasExecutions = metrics.totalTransactions > 0;
  const hasWallets = metrics.activeWallets > 0;

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your payment operations"
      />

      {/* Hero Status Banner */}
      <AgentStatusBanner agentsRequiringAttention={agentsRequiringAttention} />

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          label="Spend Today"
          value={`$${metrics.spendToday.toLocaleString()}`}
          icon={DollarSign}
          bottomContent={<SpendTrendChart data={spendTrendData} />}
        />
        <MetricCard
          label="Remaining Budget"
          value={`$${metrics.remainingBudget.toLocaleString()}`}
          subValue={(() => {
            const usedPercent = (metrics.spendToday / 3000) * 100;
            const thresholdPercent = (2400 / 3000) * 100;
            const isWithinSafeLimits = usedPercent < thresholdPercent;
            return `Daily limit${isWithinSafeLimits ? ' • Within safe limits' : ''}`;
          })()}
          chart={
            <BudgetHealthRadial
              used={metrics.spendToday}
              remaining={metrics.remainingBudget}
              threshold={2400}
              total={3000}
            />
          }
        />
        <MetricCard
          label="Success Rate"
          value={hasExecutions ? `${metrics.successRate}%` : '—'}
          subValue={hasExecutions ? undefined : 'No executions yet • System is idle and within limits'}
          chart={
            <SuccessRateDonut
              successRate={metrics.successRate}
              totalExecutions={metrics.totalTransactions}
            />
          }
        />
        <MetricCard
          label="Active Wallets"
          value={hasWallets ? metrics.activeWallets : '—'}
          subValue={hasWallets ? undefined : 'No wallets currently exposed'}
          icon={Wallet}
        />
      </div>

      {/* Large Charts Section */}
      <div className="grid gap-6 mb-6">
        {/* Spend Trend Chart - Full Width */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold">Spend Trend (24 Hours)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <SpendTrendChart data={spendTrendData} showFullChart={true} />
          </CardContent>
        </Card>

        {/* Transaction Volume and Chain Distribution */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Transaction Volume</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionVolumeChart data={transactionVolumeData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Chain Distribution</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ChainDistributionChart data={chainDistributionData} />
            </CardContent>
          </Card>
        </div>

        {/* Success Rate and Budget Health - Full Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Success Rate Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <SuccessRateDonut 
                successRate={metrics.successRate} 
                totalExecutions={metrics.totalTransactions}
                showFullChart={true}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Budget Health</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetHealthRadial
                used={metrics.spendToday}
                remaining={metrics.remainingBudget}
                threshold={2400}
                total={3000}
                showFullChart={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Approvals */}
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
              <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
              <Link to="/app/intents">
                <Button variant="ghost" size="sm" className="text-xs touch-manipulation">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pendingIntents.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No pending approvals</p>
                  <p className="text-xs text-muted-foreground">
                    Guard policies are auto-handling spend
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingIntents.map((intent) => (
                    <div
                      key={intent.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0 ring-1 ring-warning/20">
                          <Clock className="h-5 w-5 text-warning" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm break-words">${intent.amount.toLocaleString()} to {intent.recipient}</p>
                          <p className="text-xs text-muted-foreground break-words">{intent.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusChip status={intent.status} />
                        <Link to={`/app/intents/${intent.id}`}>
                          <Button size="sm" variant="outline" className="touch-manipulation">
                            Review
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <Link to="/app/transactions">
                <Button variant="ghost" size="sm" className="text-xs touch-manipulation">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <ActivitySparkline data={activitySparklineData} showFullChart={false} />
              </div>
              {recentTransactions.length === 0 && microEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-3">
                    <Zap className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No recent activity</p>
                  <p className="text-xs text-muted-foreground">
                    System is idle and within limits
                  </p>
                </div>
              ) : (
              <div className="space-y-3">
                {/* Show micro-events first if available */}
                {microEvents.length > 0 && (
                  <>
                    {microEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 py-1.5 text-xs"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-muted-foreground break-words">
                            {event.message}
                          </p>
                        </div>
                        <p className="text-muted-foreground/70 shrink-0">
                          {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                    {recentTransactions.length > 0 && <div className="border-t my-2" />}
                  </>
                )}
                {/* Show transaction details */}
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${
                        tx.status === 'succeeded' ? 'bg-success' :
                        tx.status === 'pending' ? 'bg-warning' :
                        'bg-destructive'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium break-words">
                          {tx.type === 'payment' ? `Payment to ${tx.recipient}` :
                           tx.type === 'fund' ? 'Wallet funded' :
                           tx.type === 'bridge' ? 'Bridge transfer' :
                           'Transfer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium whitespace-nowrap">
                        {tx.type === 'fund' ? '+' : '-'}${tx.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase">{tx.chain}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
