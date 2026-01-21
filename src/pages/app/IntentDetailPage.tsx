import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatusChip } from '@/components/StatusChip';
import { JsonViewer } from '@/components/JsonViewer';
import { CopyButton } from '@/components/CopyButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PaymentTimeline } from '@/components/PaymentTimeline';
import { ExplainPaymentDrawer } from '@/components/ExplainPaymentDrawer';
import { ApprovalModal } from '@/components/ApprovalModal';
import { IncidentReplay } from '@/components/IncidentReplay';
import { McpSdkContractExplorer } from '@/components/McpSdkContractExplorer';
import { AgentTrustBadge } from '@/components/AgentTrustBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Circle, ArrowLeft, ExternalLink, Info, PlayCircle, Code, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsService } from '@/services/payments';
import { agentsService } from '@/services/agents';
import type { PaymentIntent, ApprovalAction, Agent } from '@/types';
import { cn } from '@/lib/utils';
import { ReceiptDrawer } from '@/components/ReceiptDrawer';

export default function IntentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [explainDrawerOpen, setExplainDrawerOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [receiptDrawerOpen, setReceiptDrawerOpen] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  // X402 payment mode
  const [paymentMode, setPaymentMode] = useState<'standard' | 'x402'>('standard');
  // PHASE 3: Transaction verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'confirmed' | 'failed' | null>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    loadIntent();
  }, [id]);

  // Auto-sync transaction status if txHash is a UUID (Circle transfer ID)
  useEffect(() => {
    if (!intent?.txHash || intent.metadata?.explorerUrl) return;
    
    // Check if txHash is a UUID (not a blockchain hash)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(intent.txHash);
    const isBlockchainHash = intent.txHash.startsWith('0x') || /^[0-9a-fA-F]{64}$/.test(intent.txHash);
    
    // If it's a UUID and not a blockchain hash, auto-sync to get the real hash
    if (isUUID && !isBlockchainHash && intent.status === 'succeeded') {
      // Auto-trigger sync after a short delay
      const timeoutId = setTimeout(() => {
        handleVerify();
        startVerificationPolling();
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent?.txHash, intent?.status, intent?.metadata?.explorerUrl]);

  const loadIntent = async () => {
    if (!id) return;
    setLoading(true);
    const data = await paymentsService.getIntent(id);
    setIntent(data);

    // Auto-detect confirmed status if intent has blockchain txHash and succeeded status
    if (data?.txHash && data.status === 'succeeded') {
      const isBlockchainHash = data.txHash.startsWith('0x') || /^[0-9a-fA-F]{64}$/.test(data.txHash);
      if (isBlockchainHash) {
        setVerificationStatus('confirmed');
      }
    }

    // Load agent if available
    if (data?.agentId) {
      try {
        const agentData = await agentsService.getAgent(data.agentId);
        setAgent(agentData);
      } catch (error) {
        console.error('Failed to load agent:', error);
      }
    }

    setLoading(false);
  };

  const handleSimulate = async () => {
    if (!intent) return;
    setSimulating(true);
    try {
      const result = await paymentsService.simulateIntent(intent.id);
      toast.success('Payment simulated successfully', {
        description: result.requiresApproval
          ? 'This payment requires approval before execution.'
          : `Estimated fee: $${result.estimatedFee.toFixed(2)}`,
      });
      await loadIntent(); // Refresh to show updated status
    } catch (error) {
      console.error('Failed to simulate intent:', error);
      toast.error('Failed to simulate payment', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleApprove = async (action: ApprovalAction) => {
    if (!intent) return;
    setApproving(true);
    try {
      if (action === 'approve_once' || action === 'approve_similar_24h') {
        await paymentsService.approveIntent(intent.id);
      }
      // TODO: Handle deny & update guard
      await loadIntent(); // Refresh
    } catch (error) {
      console.error('Failed to approve intent:', error);
      throw error;
    } finally {
      setApproving(false);
    }
  };

  const handleApproveDirect = async () => {
    if (!intent) return;
    setApproving(true);
    try {
      await paymentsService.approveIntent(intent.id);
      toast.success('Payment approved', {
        description: 'The payment is now ready for execution.',
      });
      await loadIntent(); // Refresh
    } catch (error) {
      console.error('Failed to approve intent:', error);
      toast.error('Failed to approve payment', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setApproving(false);
    }
  };

  const getApprovalRequest = (): any => {
    if (!intent) return null;
    return {
      intentId: intent.id,
      amount: intent.amount,
      justification: intent.description,
      guardChecks: intent.guardResults,
      routeDetails: {
        route: intent.route || 'auto',
        estimatedFee: 0.5,
        estimatedTime: '2-5 minutes',
      },
    };
  };

  const handleReject = async () => {
    if (!intent) return;
    // Rejection endpoint to be implemented
  };

  const handleExecute = async () => {
    if (!intent) return;
    setExecuting(true);
    try {
      const result = await paymentsService.executeIntent(intent.id);
      if (result.success) {
        // Update intent with explorer URL if provided in response
        const responseData = result as any;
        if (responseData.explorerUrl && intent) {
          if (!intent.metadata) {
            intent.metadata = {};
          }
          intent.metadata.explorerUrl = responseData.explorerUrl;
          setIntent({ ...intent });
        }
        
        toast.success('Payment executed successfully', {
          description: result.txHash
            ? `Transaction: ${result.txHash.slice(0, 10)}...`
            : 'The payment has been sent on-chain.',
        });
        await loadIntent(); // Refresh

        // PHASE 3: Start auto-polling for verification
        if (result.txHash) {
          setVerificationStatus('pending');
          setPollCount(0);
          startVerificationPolling();
        }
      } else {
        // Extract error message from response
        const errorDetails = (result as any).details || (result as any).message || 'The payment could not be executed.';
        toast.error('Payment execution failed', {
          description: errorDetails,
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      // Try to extract error message from response
      let errorMessage = 'Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const err = error as any;
        errorMessage = err.details || err.message || err.error || errorMessage;
      }
      toast.error('Failed to execute payment', {
        description: errorMessage,
        duration: 6000,
      });
    } finally {
      setExecuting(false);
    }
  };

  // PHASE 3: Transaction verification handlers
  const handleVerify = async () => {
    if (!intent?.id) return;
    setVerifying(true);
    try {
      const response = await fetch(`/api/payments/${intent.id}/sync`);
      const data = await response.json();

      if (response.ok) {
        setVerificationStatus(data.transactionStatus);
        if (data.intent) {
          setIntent(data.intent);
        }

        if (data.transactionStatus === 'confirmed') {
          toast.success('Transaction confirmed on-chain');
        } else if (data.transactionStatus === 'failed') {
          toast.error('Transaction failed on-chain');
        }
      } else {
        toast.error('Failed to verify transaction');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify transaction');
    } finally {
      setVerifying(false);
    }
  };

  const startVerificationPolling = () => {
    let count = 0;
    let consecutiveErrors = 0;
    const maxPolls = 10; // 30 seconds (3s interval)
    const maxConsecutiveErrors = 5; // Stop after 5 consecutive errors

    const pollInterval = setInterval(async () => {
      count++;
      setPollCount(count);

      if (count >= maxPolls) {
        clearInterval(pollInterval);
        setVerificationStatus(null);
        setPollCount(0);
        toast.info('Verification timeout', {
          description: 'Confirmation delayed — check explorer link',
        });
        return;
      }

      try {
        if (!intent?.id) {
          clearInterval(pollInterval);
          return;
        }
        
        const response = await fetch(`/api/payments/${intent.id}/sync`);
        
        // Check if response is OK
        if (!response.ok) {
          consecutiveErrors++;
          // Continue polling unless we have too many consecutive errors
          if (consecutiveErrors >= maxConsecutiveErrors) {
            clearInterval(pollInterval);
            setVerificationStatus(null);
            setPollCount(0);
            console.warn('Polling stopped due to repeated errors');
            toast.error('Failed to verify transaction', {
              description: 'Please check the explorer link manually',
            });
          }
          return;
        }
        
        // Reset error counter on success
        consecutiveErrors = 0;
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // Not JSON response, skip this poll but continue
          return;
        }
        
        const data = await response.json();

        if (data.transactionStatus === 'confirmed' || data.transactionStatus === 'failed') {
          clearInterval(pollInterval);
          setVerificationStatus(data.transactionStatus);
          setPollCount(0);
          if (data.intent) {
            setIntent(data.intent);
          }

          if (data.transactionStatus === 'confirmed') {
            toast.success('Transaction confirmed on-chain');
          } else {
            toast.error('Transaction failed on-chain');
          }
        }
      } catch (error) {
        consecutiveErrors++;
        // Only log error if it's not a JSON parse error (which we handle above)
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
          // Silently skip JSON parse errors - response might not be ready yet
          if (consecutiveErrors >= maxConsecutiveErrors) {
            clearInterval(pollInterval);
            setVerificationStatus(null);
            setPollCount(0);
            console.warn('Polling stopped: repeated JSON parse errors');
            toast.error('Failed to verify transaction', {
              description: 'Please check the explorer link manually',
            });
          }
        } else {
          console.error('Polling error:', error);
          if (consecutiveErrors >= maxConsecutiveErrors) {
            clearInterval(pollInterval);
            setVerificationStatus(null);
            setPollCount(0);
            toast.error('Failed to verify transaction', {
              description: 'Please check the explorer link manually',
            });
          }
        }
      }
    }, 3000);
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Payment Intent"
          breadcrumbs={[
            { label: 'Payment Intents', href: '/app/intents' },
            { label: 'Loading...' },
          ]}
        />
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  if (!intent) {
    return (
      <div>
        <PageHeader
          title="Intent Not Found"
          breadcrumbs={[
            { label: 'Payment Intents', href: '/app/intents' },
            { label: 'Not Found' },
          ]}
        />
        <p>The requested payment intent could not be found.</p>
        <Link to="/app/intents">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Intents
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Payment to ${intent.recipient}`}
        breadcrumbs={[
          { label: 'Payment Intents', href: '/app/intents' },
          { label: intent.id },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setExplainDrawerOpen(true)}
              aria-label="Explain payment"
            >
              <Info className="h-4 w-4 mr-2" />
              Explain
            </Button>
            <Button
              variant="outline"
              onClick={() => setReceiptDrawerOpen(true)}
              aria-label="View receipt"
            >
              <FileText className="h-4 w-4 mr-2" />
              Receipt
            </Button>
            {intent.status === 'pending' && (
              <Button
                onClick={handleSimulate}
                disabled={simulating}
                aria-label="Simulate payment intent"
              >
                {simulating ? 'Simulating...' : 'Simulate Payment'}
              </Button>
            )}
            {intent.status === 'awaiting_approval' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setApprovalModalOpen(true)}
                  aria-label="Approve payment intent with options"
                >
                  Review & Approve
                </Button>
                <Button
                  onClick={handleApproveDirect}
                  disabled={approving}
                  aria-label="Approve payment intent directly"
                >
                  {approving ? 'Approving...' : 'Approve Payment'}
                </Button>
              </>
            )}
            {intent.status === 'approved' && (
              <div className="flex gap-2">
                <Tabs value={paymentMode} onValueChange={(v) => setPaymentMode(v as 'standard' | 'x402')} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="standard">Standard</TabsTrigger>
                    <TabsTrigger value="x402">X402 (Gasless) 🚀</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  onClick={handleExecute}
                  disabled={executing}
                  aria-label="Execute payment intent"
                >
                  {executing ? 'Executing...' : `Execute ${paymentMode === 'x402' ? 'X402' : 'Payment'}`}
                </Button>
              </div>
            )}
            {/* PHASE 3: Show verify button after execution */}
            {(intent.status === 'succeeded' || intent.status === 'executing') && intent.txHash && (
              <Button
                variant="outline"
                onClick={handleVerify}
                disabled={verifying}
                aria-label="Verify transaction status"
              >
                {verifying ? 'Verifying...' : verificationStatus === 'pending' ? 'Verifying...' : 'Verify Status'}
              </Button>
            )}
          </div>
        }
      />

      <ExplainPaymentDrawer
        intentId={intent.id}
        open={explainDrawerOpen}
        onOpenChange={setExplainDrawerOpen}
      />

      <ReceiptDrawer
        open={receiptDrawerOpen}
        onOpenChange={setReceiptDrawerOpen}
        intentId={intent.id}
      />

      <ApprovalModal
        open={approvalModalOpen}
        onOpenChange={setApprovalModalOpen}
        request={getApprovalRequest()}
        onApprove={handleApprove}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Intent Details</CardTitle>
                <StatusChip status={intent.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-xl font-semibold">
                    ${intent.amount.toLocaleString()} {intent.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chain</p>
                  <p className="text-sm font-medium capitalize">{intent.chain}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recipient</p>
                  <p className="text-sm font-medium">{intent.recipient}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <div className="flex items-center gap-1">
                    <code className="text-xs font-mono">{intent.recipientAddress}</code>
                    <CopyButton value={intent.recipientAddress} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{intent.description}</p>
              </div>

              {intent.agentId && agent && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Agent</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{agent.name}</span>
                      <AgentTrustBadge agent={agent} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{agent.purpose}</p>
                  </div>
                </>
              )}

              {intent.paymentLink && intent.intentType === 'payment_link' && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Payment Link</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1">
                        {intent.paymentLink.url}
                      </code>
                      <CopyButton value={intent.paymentLink.url} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => window.open(intent.paymentLink?.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    {intent.paymentLink.expiresAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {new Date(intent.paymentLink.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </>
              )}

              {intent.txHash && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {intent.txHash}
                      </code>
                      <CopyButton value={intent.txHash} />
                      {intent.metadata?.explorerUrl || (intent as any).explorerUrl ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => window.open((intent.metadata?.explorerUrl || (intent as any).explorerUrl) as string, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Explorer link unavailable</span>
                      )}
                    </div>
                    {/* PHASE 3: Verification status indicator */}
                    {verificationStatus && (
                      <div className="mt-2 flex items-center gap-2">
                        {verificationStatus === 'pending' && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">
                            ⏳ Pending confirmation... ({pollCount}/10)
                          </span>
                        )}
                        {verificationStatus === 'confirmed' && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            ✓ Confirmed on-chain
                          </span>
                        )}
                        {verificationStatus === 'failed' && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            ✗ Transaction failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Decision Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentTimeline intentId={intent.id} />
            </CardContent>
          </Card>

          {/* Tabs for additional features */}
          <Tabs defaultValue="replay" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="replay" className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                Incident Replay
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Contract Explorer
              </TabsTrigger>
            </TabsList>
            <TabsContent value="replay" className="mt-4">
              <IncidentReplay intentId={intent.id} />
            </TabsContent>
            <TabsContent value="contract" className="mt-4">
              <McpSdkContractExplorer intentId={intent.id} />
            </TabsContent>
          </Tabs>

          {/* Metadata */}
          {intent.metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <JsonViewer data={intent.metadata} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Steps Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {intent.steps.map((step, idx) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : step.status === 'failed' ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : step.status === 'in_progress' ? (
                        <div className="h-5 w-5 rounded-full border-2 border-primary animate-pulse" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      {idx < intent.steps.length - 1 && (
                        <div className={cn(
                          'w-px flex-1 mt-1',
                          step.status === 'completed' ? 'bg-success' : 'bg-border'
                        )} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className={cn(
                        'text-sm font-medium',
                        step.status === 'pending' && 'text-muted-foreground'
                      )}>
                        {step.name}
                      </p>
                      {step.timestamp && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                      {step.details && (
                        <p className="text-xs text-destructive mt-1">{step.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons based on Status */}
              <Separator className="my-4" />
              <div className="space-y-2">
                {intent.status === 'pending' && (
                  <Button
                    onClick={handleSimulate}
                    disabled={simulating}
                    className="w-full"
                    aria-label="Simulate payment intent"
                  >
                    {simulating ? 'Simulating...' : 'Simulate Payment'}
                  </Button>
                )}
                {intent.status === 'awaiting_approval' && (
                  <div className="space-y-2">
                    <Button
                      onClick={handleApproveDirect}
                      disabled={approving}
                      className="w-full"
                      aria-label="Approve payment intent"
                    >
                      {approving ? 'Approving...' : 'Approve Payment'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setApprovalModalOpen(true)}
                      className="w-full"
                      aria-label="Review and approve with options"
                    >
                      Review & Approve
                    </Button>
                  </div>
                )}
                {intent.status === 'approved' && (
                  <Button
                    onClick={handleExecute}
                    disabled={executing}
                    className="w-full"
                    aria-label="Execute payment intent"
                  >
                    {executing ? 'Executing...' : 'Execute Payment'}
                  </Button>
                )}
                {intent.status === 'succeeded' && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => setReceiptDrawerOpen(true)}
                      className="w-full"
                      aria-label="View receipt"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Receipt
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Scroll to replay section
                        document.querySelector('[value="replay"]')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full"
                      aria-label="Replay incident"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Replay Incident
                    </Button>
                  </div>
                )}
                {(intent.status === 'failed' || intent.status === 'blocked') && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    Payment {intent.status === 'failed' ? 'failed' : 'blocked'}. Check guard results above.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Guard Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Guard Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {intent.guardResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{result.guardName}</p>
                      {result.reason && (
                        <p className="text-xs text-muted-foreground">{result.reason}</p>
                      )}
                    </div>
                    {result.passed ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
