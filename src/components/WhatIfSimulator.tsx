import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WhatIfSimulationResult, GuardPreset, ChainId } from '@/types';
import { paymentsService } from '@/services/payments';
import { guardsService } from '@/services/guards';

interface WhatIfSimulatorProps {
  className?: string;
}

export function WhatIfSimulator({ className }: WhatIfSimulatorProps) {
  const [amount, setAmount] = useState('');
  const [guardPresetId, setGuardPresetId] = useState<string>('none');
  const [chain] = useState<ChainId>('arc-testnet'); // ARC network only
  const [time, setTime] = useState('');
  const [result, setResult] = useState<WhatIfSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<GuardPreset[]>([]);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const data = await guardsService.getPresets();
    setPresets(data);
  };

  const handleSimulate = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      const data = await paymentsService.whatIfSimulate({
        amount: parseFloat(amount),
        guardPresetId: guardPresetId === 'none' ? undefined : guardPresetId,
        chain: chain || undefined,
        time: time || undefined,
      });
      setResult(data);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">What-If Simulation</CardTitle>
        <CardDescription>Test payment scenarios before execution</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sim-amount">Amount (USDC)</Label>
          <Input
            id="sim-amount"
            type="number"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Network</Label>
          <div className="px-3 py-2 bg-muted rounded-md text-sm">
            ARC Testnet
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sim-preset">Guard Preset (Optional)</Label>
          <Select value={guardPresetId} onValueChange={setGuardPresetId}>
            <SelectTrigger id="sim-preset">
              <SelectValue placeholder="Use current guards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Use current guards</SelectItem>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sim-time">Time (Optional)</Label>
          <Input
            id="sim-time"
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <Button onClick={handleSimulate} disabled={!amount || loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Simulating...
            </>
          ) : (
            'Simulate'
          )}
        </Button>

        {result && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <div
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg',
                result.allowed ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'
              )}
            >
              {result.allowed ? (
                <CheckCircle className="h-6 w-6 text-success" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
              <div className="flex-1">
                <p className={cn('font-semibold', result.allowed ? 'text-success' : 'text-destructive')}>
                  {result.allowed ? 'Payment Allowed' : 'Payment Blocked'}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{result.reason}</p>
              </div>
            </div>

            {result.guardResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Guard Results:</p>
                {result.guardResults.map((guard, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border text-sm"
                  >
                    <div>
                      <p className="font-medium">{guard.guardName}</p>
                      {guard.reason && (
                        <p className="text-xs text-muted-foreground">{guard.reason}</p>
                      )}
                    </div>
                    <Badge
                      variant={guard.passed ? 'default' : 'destructive'}
                      className={cn(
                        guard.passed
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      )}
                    >
                      {guard.passed ? 'Pass' : 'Fail'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {result.estimatedFee !== undefined && (
              <div className="text-sm">
                <span className="text-muted-foreground">Estimated Fee:</span>{' '}
                <span className="font-medium">${result.estimatedFee}</span>
              </div>
            )}

            {result.route && (
              <div className="text-sm">
                <span className="text-muted-foreground">Route:</span>{' '}
                <Badge variant="outline" className="ml-2">
                  {result.route.toUpperCase()}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
