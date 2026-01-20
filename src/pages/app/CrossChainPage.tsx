import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Info, CheckCircle, Clock, Loader2, Sparkles } from 'lucide-react';
import { crosschainService } from '@/services/crosschain';
import type { ChainId, RouteType, CrossChainTransfer } from '@/types';
import { cn } from '@/lib/utils';

const CHAINS = crosschainService.getChainNames();
const ROUTES = crosschainService.getRouteInfo();

export default function CrossChainPage() {
  const [sourceChain, setSourceChain] = useState<ChainId>('arc-testnet');
  const [destChain, setDestChain] = useState<ChainId>('arc-testnet');
  const [amount, setAmount] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<RouteType>('auto');
  const [routeEstimate, setRouteEstimate] = useState<{
    route: RouteType;
    explanation: string;
    eta: string;
    fee: number;
    steps: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<CrossChainTransfer[]>([]);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      const data = await crosschainService.getTransfers();
      setTransfers(data);
    } catch (error) {
      console.error('Failed to load transfers:', error);
    }
  };

  const handleEstimate = async () => {
    if (!amount) return;
    setLoading(true);
    const estimate = await crosschainService.estimateRoute(
      sourceChain,
      destChain,
      parseFloat(amount),
      selectedRoute
    );
    setRouteEstimate(estimate);
    setLoading(false);
  };

  const handleInitiate = async () => {
    if (!amount || !routeEstimate) return;
    setLoading(true);
    try {
      await crosschainService.initiateTransfer({
        sourceChain,
        destinationChain: destChain,
        amount: parseFloat(amount),
        destinationAddress: destAddress || 'Same as source',
        route: routeEstimate.route,
      });
      // Reset form
      setAmount('');
      setDestAddress('');
      setRouteEstimate(null);
      // Reload transfers
      await loadTransfers();
    } catch (error) {
      console.error('Failed to initiate transfer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Cross-chain Transfers"
        description="ARC Network - Single chain transfers only"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transfer Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Transfer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Network Info */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Network</Label>
                </div>
                <div className="px-3 py-2 bg-background rounded-md text-sm">
                  ARC Testnet (ARC-only hackathon - cross-chain transfers not available)
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount (USDC)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Destination Address */}
              <div className="space-y-2">
                <Label>Destination Address (optional)</Label>
                <Input
                  placeholder="Leave empty to use same address"
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                />
              </div>

              {/* Route Selection */}
              <div className="space-y-2">
                <Label>Route Preference</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(ROUTES).map(([id, info]) => {
                    const isSelected = selectedRoute === id;
                    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    
                    return (
                      <motion.button
                        key={id}
                        onClick={() => setSelectedRoute(id as RouteType)}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        )}
                        whileHover={prefersReducedMotion ? {} : {
                          y: -2,
                          transition: { duration: 0.15, ease: "easeOut" }
                        }}
                        whileTap={prefersReducedMotion ? {} : {
                          scale: 0.98,
                          transition: { duration: 0.1, ease: "easeOut" }
                        }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <p className="font-medium text-sm">{info.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {info.description}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={handleEstimate}
                disabled={!amount || loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Get Route Quote
              </Button>
            </CardContent>
          </Card>

          {/* Route Explanation */}
          <AnimatePresence>
            {routeEstimate && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Route Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Route</p>
                    <p className="font-medium">{ROUTES[routeEstimate.route].name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Time</p>
                    <p className="font-medium">{routeEstimate.eta}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fee</p>
                    <p className="font-medium">${routeEstimate.fee.toFixed(2)}</p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">{routeEstimate.explanation}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Steps</p>
                  <div className="space-y-2">
                    {routeEstimate.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleInitiate} className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Initiate Transfer
                </Button>
              </CardContent>
            </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Transfers */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              {transfers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No transfers yet
                </p>
              ) : (
                <div className="space-y-4">
                  {transfers.map((transfer) => (
                    <div key={transfer.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          ${transfer.amount.toLocaleString()} USDC
                        </span>
                        <StatusChip status={transfer.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{transfer.sourceChain}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="capitalize">{transfer.destinationChain}</span>
                      </div>
                      
                      {/* Steps timeline */}
                      <div className="mt-3 space-y-1">
                        {transfer.steps.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            {step.status === 'completed' ? (
                              <CheckCircle className="h-3 w-3 text-success" />
                            ) : step.status === 'in_progress' ? (
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            ) : (
                              <Clock className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={step.status === 'pending' ? 'text-muted-foreground' : ''}>
                              {step.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
