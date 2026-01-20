import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/CopyButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Loader2, ShoppingBag, Store, Link as LinkIcon } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { StatusChip } from '@/components/StatusChip';

interface Connection {
  id: string;
  platform: 'shopify' | 'woocommerce';
  status: 'connected' | 'disconnected';
  webhookUrl: string;
  secret: string;
  createdAt: string;
}

export default function CommercePluginsPage() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  
  // Simulator state
  const [simPlatform, setSimPlatform] = useState<'shopify' | 'woocommerce'>('shopify');
  const [simOrderTotal, setSimOrderTotal] = useState('');
  const [simMerchantName, setSimMerchantName] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ intentId: string; status: string } | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Connection[]>('/plugins/connections');
      setConnections(data);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: 'shopify' | 'woocommerce') => {
    setConnecting(platform);
    try {
      const result = await apiClient.post<{
        connectionId: string;
        status: string;
        webhookUrl: string;
        secret: string;
      }>(`/plugins/${platform}/connect`, {});
      
      toast({
        title: 'Success',
        description: `${platform} connected successfully`,
      });
      
      await loadConnections();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to connect',
        variant: 'destructive',
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleSimulate = async () => {
    if (!simOrderTotal) {
      toast({
        title: 'Error',
        description: 'Order total is required',
        variant: 'destructive',
      });
      return;
    }

    setSimulating(true);
    setSimResult(null);
    try {
      const result = await apiClient.post<{
        success: boolean;
        intentId: string;
        status: string;
        guardDecision: unknown[];
      }>('/plugins/simulate-order', {
        platform: simPlatform,
        orderTotal: parseFloat(simOrderTotal),
        merchantName: simMerchantName || 'Demo Merchant',
      });
      
      setSimResult({ intentId: result.intentId, status: result.status });
      toast({
        title: 'Success',
        description: 'Order simulated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to simulate order',
        variant: 'destructive',
      });
    } finally {
      setSimulating(false);
    }
  };

  const shopifyConnection = connections.find(c => c.platform === 'shopify');
  const woocommerceConnection = connections.find(c => c.platform === 'woocommerce');

  return (
    <div>
      <PageHeader
        title="Commerce Plugins"
        description="Connect Shopify and WooCommerce for automatic payment processing"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shopify Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Shopify
            </CardTitle>
            <CardDescription>
              Connect your Shopify store to automatically process payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {shopifyConnection ? (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant={shopifyConnection.status === 'connected' ? 'default' : 'secondary'}>
                    {shopifyConnection.status === 'connected' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Disconnected
                      </>
                    )}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                      {shopifyConnection.webhookUrl}
                    </code>
                    <CopyButton value={shopifyConnection.webhookUrl} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                      {shopifyConnection.secret}
                    </code>
                    <CopyButton value={shopifyConnection.secret} />
                  </div>
                </div>
              </>
            ) : (
              <Button
                onClick={() => handleConnect('shopify')}
                disabled={connecting === 'shopify'}
                className="w-full"
              >
                {connecting === 'shopify' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect Shopify
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* WooCommerce Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-5 w-5" />
              WooCommerce
            </CardTitle>
            <CardDescription>
              Connect your WooCommerce store to automatically process payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {woocommerceConnection ? (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant={woocommerceConnection.status === 'connected' ? 'default' : 'secondary'}>
                    {woocommerceConnection.status === 'connected' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Disconnected
                      </>
                    )}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                      {woocommerceConnection.webhookUrl}
                    </code>
                    <CopyButton value={woocommerceConnection.webhookUrl} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                      {woocommerceConnection.secret}
                    </code>
                    <CopyButton value={woocommerceConnection.secret} />
                  </div>
                </div>
              </>
            ) : (
              <Button
                onClick={() => handleConnect('woocommerce')}
                disabled={connecting === 'woocommerce'}
                className="w-full"
              >
                {connecting === 'woocommerce' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect WooCommerce
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Simulator */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Order Simulator</CardTitle>
          <CardDescription>
            Test the webhook integration by simulating an order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={simPlatform} onValueChange={(v) => setSimPlatform(v as 'shopify' | 'woocommerce')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="woocommerce">WooCommerce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Order Total ($)</Label>
              <Input
                type="number"
                placeholder="100.00"
                value={simOrderTotal}
                onChange={(e) => setSimOrderTotal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Merchant Name</Label>
              <Input
                placeholder="Demo Merchant"
                value={simMerchantName}
                onChange={(e) => setSimMerchantName(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleSimulate}
            disabled={simulating || !simOrderTotal}
            className="w-full"
          >
            {simulating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Store className="h-4 w-4 mr-2" />
                Simulate Order
              </>
            )}
          </Button>

          {simResult && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Created Intent</span>
                  <StatusChip status={simResult.status} />
                </div>
                <div className="text-xs font-mono text-muted-foreground break-all">
                  {simResult.intentId}
                </div>
                <Link to={`/app/intents/${simResult.intentId}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Intent Details
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
