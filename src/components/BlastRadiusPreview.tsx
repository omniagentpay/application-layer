import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users, Wrench, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlastRadius } from '@/types';
import { guardsService } from '@/services/guards';
import { LoadingSkeleton } from './LoadingSkeleton';

interface BlastRadiusPreviewProps {
  guardId?: string;
  className?: string;
}

export function BlastRadiusPreview({ guardId, className }: BlastRadiusPreviewProps) {
  const [blastRadius, setBlastRadius] = useState<BlastRadius | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlastRadius();
  }, [guardId]);

  const loadBlastRadius = async () => {
    setLoading(true);
    try {
      const data = await guardsService.getBlastRadius(guardId);
      setBlastRadius(data);
    } catch (error) {
      console.error('Failed to load blast radius:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="card" count={1} className={className} />;
  }

  if (!blastRadius) {
    return null;
  }

  const impactColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    low: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Blast Radius Preview
        </CardTitle>
        <CardDescription>Impact analysis of guard rule changes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Affected Agents */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Affected Agents</h3>
            <Badge variant="outline" className="ml-auto">
              {blastRadius.affectedAgents.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {blastRadius.affectedAgents.map((agent) => (
              <div
                key={agent.agentId}
                className={cn(
                  'flex items-center justify-between p-2 rounded border text-sm',
                  impactColors[agent.impact]
                )}
              >
                <span className="font-medium">{agent.agentName}</span>
                <Badge variant="outline" className="text-xs">
                  {agent.impact}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Affected Tools */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Affected Tools</h3>
            <Badge variant="outline" className="ml-auto">
              {blastRadius.affectedTools.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {blastRadius.affectedTools.map((tool) => (
              <div
                key={tool.toolId}
                className="flex items-center justify-between p-2 rounded border text-sm"
              >
                <code className="text-xs font-mono">{tool.toolName}</code>
                <span className="text-xs text-muted-foreground">{tool.usageCount} uses</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Exposure */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Daily Exposure</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Current Daily Spend</span>
              <span className="text-sm font-medium">${blastRadius.currentDailySpend.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Estimated Daily Exposure</span>
              <span className="text-sm font-medium">${blastRadius.estimatedDailyExposure.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min((blastRadius.currentDailySpend / blastRadius.estimatedDailyExposure) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
