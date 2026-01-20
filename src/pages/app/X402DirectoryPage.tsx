import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { JsonViewer } from '@/components/JsonViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Star, ExternalLink, Loader2 } from 'lucide-react';
import { x402Service } from '@/services/x402';
import type { X402Api, PaymentIntent } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function X402DirectoryPage() {
  const [apis, setApis] = useState<X402Api[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApi, setSelectedApi] = useState<X402Api | null>(null);
  const [trying, setTrying] = useState(false);
  const [tryResult, setTryResult] = useState<{
    intent?: PaymentIntent;
    result?: { 
      data: unknown; 
      latency: number;
      payment?: {
        amount: number;
        currency: string;
        transactionId?: string;
        status: string;
      };
    };
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadApis();
  }, []);

  const loadApis = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await x402Service.getApis();
      setApis(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load APIs';
      setError(message);
      console.error('Failed to load APIs:', err);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTryApi = async (api: X402Api) => {
    setSelectedApi(api);
    setTrying(true);
    setTryResult(null);
    try {
      // x402 Flow: Agent attempts API → Payment Required (402) → Payment executed automatically → Response
      // No wallet ID needed - uses agent wallet automatically
      const result = await x402Service.tryApi(api.id);
      setTryResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to call API';
      console.error('Failed to call API:', err);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      setSelectedApi(null);
    } finally {
      setTrying(false);
    }
  };

  const filteredApis = apis.filter((api) =>
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="x402 API Directory" />
        <LoadingSkeleton variant="card" count={6} />
      </div>
    );
  }

  if (error && apis.length === 0) {
    return (
      <div>
        <PageHeader title="x402 API Directory" />
        <EmptyState
          title="Failed to load APIs"
          description={error}
          variant="error"
          action={{
            label: 'Retry',
            onClick: loadApis,
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="x402 API Directory"
        description="Discover and use paid APIs with automatic micropayments"
      />

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search APIs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* API Grid */}
      {filteredApis.length === 0 ? (
        <EmptyState
          title="No APIs found"
          description={searchQuery ? `No APIs match "${searchQuery}"` : 'No APIs available'}
          variant="search"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredApis.map((api, index) => (
          <motion.div
            key={api.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{api.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{api.provider}</p>
                </div>
                <Badge variant="secondary">{api.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {api.description}
              </p>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    ${api.price.toFixed(3)}
                  </span>
                  <span className="text-xs text-muted-foreground">per call</span>
                </div>
                {api.rating && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    {api.rating}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {api.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleTryApi(api)}
                >
                  Try It
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>
          ))}
        </div>
      )}

      {/* Try API Dialog */}
      <Dialog open={!!selectedApi} onOpenChange={() => {
        setSelectedApi(null);
        setTryResult(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Try {selectedApi?.name}</DialogTitle>
          </DialogHeader>
          
          {trying ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Agent attempting API call...
              </p>
              <p className="text-xs text-muted-foreground">
                x402 flow: API → 402 Payment Required → Auto-payment → Response
              </p>
            </div>
          ) : tryResult ? (
            <div className="space-y-4">
              {/* x402 Flow Steps */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">x402 Protocol Executed</span>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    Succeeded
                  </Badge>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    <span>Agent attempted API call</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    <span>API returned 402 Payment Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    <span>Payment executed automatically via Circle wallet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    <span>API call retried and succeeded</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {tryResult.intent && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Payment Details</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Intent ID: {tryResult.intent.id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Amount: ${selectedApi?.price.toFixed(3)} USDC
                  </p>
                  {tryResult.result?.payment?.transactionId && (
                    <p className="text-xs text-muted-foreground">
                      Transaction: {tryResult.result.payment.transactionId.slice(0, 20)}...
                    </p>
                  )}
                </div>
              )}

              {/* API Response */}
              {tryResult.result && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">API Response</span>
                    <span className="text-xs text-muted-foreground">
                      {tryResult.result.latency}ms
                    </span>
                  </div>
                  <JsonViewer data={tryResult.result.data} />
                </div>
              )}

              <Button onClick={() => {
                setSelectedApi(null);
                setTryResult(null);
              }} className="w-full">
                Done
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
