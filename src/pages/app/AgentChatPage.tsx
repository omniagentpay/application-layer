import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { StatusChip } from '@/components/StatusChip';
import { JsonViewer } from '@/components/JsonViewer';
import { CommandTerminal } from '@/components/CommandTerminal';
import { AgentOrb } from '@/components/AgentOrb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Bot, User, CheckCircle, XCircle, Loader2, AlertCircle, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import type { ChatMessage, PaymentIntent } from '@/types';
import { paymentsService } from '@/services/payments';
import { geminiService } from '@/services/gemini';
import { cn } from '@/lib/utils';
import { ensureUserInSupabase } from '@/lib/supabase';
import { saveChatMessages, loadChatMessages, clearChatMessages } from '@/services/supabase/chats';

export default function AgentChatPage() {
  const { wallets: privyWallets } = useWallets();
  const { user, authenticated } = usePrivy();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<PaymentIntent | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  
  // Get default wallet and chain from Privy
  const defaultWalletId = privyWallets.length > 0 ? privyWallets[0].address : undefined;
  const defaultChain = 'arc-testnet';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize user and load chat history from Supabase
  useEffect(() => {
    if (isInitializedRef.current || !authenticated || !user) return;
    isInitializedRef.current = true;

    const initializeChat = async () => {
      try {
        const privyUserId = user.id;
        const email = user.email?.address || user.google?.email || undefined;
        const walletAddress = user.wallet?.address || privyWallets?.[0]?.address || undefined;

        const userId = await ensureUserInSupabase(privyUserId, email, walletAddress);
        if (!userId) {
          console.error('Failed to get or create user in Supabase');
          return;
        }

        setSupabaseUserId(userId);

        // Load chat history from Supabase
        const savedMessages = await loadChatMessages(userId);

        if (savedMessages.length > 0) {
          setMessages(savedMessages);
        } else if (geminiService.isConfigured()) {
          // Add welcome message only if no saved history and Gemini is configured
          const welcomeMessage: ChatMessage = {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm your OmniAgentPay assistant. I can help you:\n\n• Check wallet balances\n• Create and execute payments\n• View transaction history\n• Simulate payments to check guard compliance\n\nWhat would you like to do?",
            timestamp: new Date().toISOString(),
          };
          setMessages([welcomeMessage]);
        }

        loadPendingIntent();
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, user, privyWallets]);

  // Save messages to Supabase whenever they change
  useEffect(() => {
    if (isInitializedRef.current && messages.length > 0 && supabaseUserId) {
      // Debounce saves to avoid too many database calls
      const timeoutId = setTimeout(() => {
        saveChatMessages(supabaseUserId, messages).catch((error) => {
          console.error('Failed to save chat messages:', error);
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, supabaseUserId]);

  const loadPendingIntent = useCallback(async () => {
    try {
      const intents = await paymentsService.getIntents();
      const pending = intents.find(i => i.status === 'awaiting_approval');
      setPendingIntent(pending || null);
    } catch (error) {
      console.error('Failed to load pending intent:', error);
    }
  }, []);

  const handleQuickAction = useCallback(async (messageText: string) => {
    if (isTyping || !geminiService.isConfigured()) return;

    setIsTyping(true);

    try {
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString(),
      };

      // Filter out welcome message when sending to Gemini
      const conversationMessages = messages.filter(msg => msg.id !== 'welcome');
      const currentMessages = [...conversationMessages, userMessage];
      const response = await geminiService.chat(currentMessages, {
        defaultWalletId,
        defaultChain,
        privyUserId: user?.id,
        privyWalletAddresses: privyWallets.map(w => w.address),
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        toolCalls: response.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.toolCalls?.some(tc => 
        ['create_payment_intent', 'approve_payment', 'execute_payment'].includes(tc.tool)
      )) {
        await loadPendingIntent();
      }
    } catch (error) {
      console.error('Gemini chat error:', error);
      
      // Handle rate limit errors specifically
      if (error instanceof Error && (error as any).rateLimitInfo) {
        const rateLimitInfo = (error as any).rateLimitInfo;
        const retryAfter = rateLimitInfo.retryAfter;
        
        let errorMessage = 'Rate limit exceeded. You\'ve made too many requests.';
        if (retryAfter && retryAfter > 0) {
          const minutes = Math.floor(retryAfter / 60);
          const seconds = retryAfter % 60;
          errorMessage += ` Please try again in ${minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''} and ` : ''}${seconds} second${seconds !== 1 ? 's' : ''}.`;
        }
        
        toast.error(errorMessage, {
          duration: 5000,
        });
      } else {
        toast.error('Failed to get agent response. Please try again.');
      }
    } finally {
      setIsTyping(false);
    }
  }, [messages, isTyping, loadPendingIntent, defaultWalletId, defaultChain]);

  const handleSend = useCallback(async () => {
    const messageText = input.trim();
    if (!messageText || isTyping) return;

    // Check if Gemini is configured
    if (!geminiService.isConfigured()) {
      toast.error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Filter out welcome message when sending to Gemini
      const conversationMessages = messages.filter(msg => msg.id !== 'welcome');
      const currentMessages = [...conversationMessages, userMessage];
      const response = await geminiService.chat(currentMessages, {
        defaultWalletId,
        defaultChain,
        privyUserId: user?.id,
        privyWalletAddresses: privyWallets.map(w => w.address),
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        toolCalls: response.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Reload pending intent if payment was created/approved
      if (response.toolCalls?.some(tc => 
        ['create_payment_intent', 'approve_payment', 'execute_payment'].includes(tc.tool)
      )) {
        await loadPendingIntent();
      }
    } catch (error) {
      console.error('Gemini chat error:', error);
      
      let errorContent = `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your configuration.`;
      
      // Handle rate limit errors specifically
      if (error instanceof Error && (error as any).rateLimitInfo) {
        const rateLimitInfo = (error as any).rateLimitInfo;
        const retryAfter = rateLimitInfo.retryAfter;
        const limits = rateLimitInfo.limits;
        
        errorContent = `Rate limit exceeded. You've made too many requests.\n\n`;
        
        if (limits) {
          errorContent += `Current usage:\n`;
          errorContent += `• Per minute: ${limits.minute.current}/${limits.minute.max}\n`;
          errorContent += `• Per hour: ${limits.hour.current}/${limits.hour.max}\n`;
          errorContent += `• Per day: ${limits.day.current}/${limits.day.max}\n\n`;
        }
        
        if (retryAfter && retryAfter > 0) {
          const minutes = Math.floor(retryAfter / 60);
          const seconds = retryAfter % 60;
          errorContent += `Please try again in ${minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''} and ` : ''}${seconds} second${seconds !== 1 ? 's' : ''}.`;
        } else {
          errorContent += `Please wait a moment before trying again.`;
        }
        
        toast.error('Rate limit exceeded. Please wait before trying again.', {
          duration: 5000,
        });
      } else {
        toast.error('Failed to get agent response. Please try again.');
      }
      
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages, isTyping, loadPendingIntent, defaultWalletId, defaultChain]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = useCallback(async () => {
    if (confirm('Are you sure you want to clear the chat history? This action cannot be undone.')) {
      try {
        if (supabaseUserId) {
          await clearChatMessages(supabaseUserId);
        }
        setMessages([]);
        
        // Add welcome message back if Gemini is configured
        if (geminiService.isConfigured()) {
          const welcomeMessage: ChatMessage = {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm your OmniAgentPay assistant. I can help you:\n\n• Check wallet balances\n• Create and execute payments\n• View transaction history\n• Simulate payments to check guard compliance\n\nWhat would you like to do?",
            timestamp: new Date().toISOString(),
          };
          setMessages([welcomeMessage]);
        }
        toast.success('Chat history cleared');
      } catch (error) {
        console.error('Error clearing chat history:', error);
        toast.error('Failed to clear chat history');
      }
    }
  }, [supabaseUserId]);


  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <PageHeader 
        title="Agent Chat" 
        description="Interact with your payment agent"
        actions={
          messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear History
            </Button>
          )
        }
      />

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chat Area - Narrower Left Container */}
        <div className="w-[500px] flex flex-col min-h-0 relative shrink-0">
          {/* Three.js Orb Background */}
          <div className="absolute top-0 right-0 w-64 h-64 -z-10">
            <AgentOrb />
          </div>
          
          <div className="flex-1 flex flex-col border border-border rounded-lg bg-card overflow-hidden min-h-0 shadow-sm">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  Ask me to make payments, check balances, or transfer funds. Try examples like:
                </p>
                <div className="space-y-2 w-full max-w-md">
                  <div className="text-left bg-muted/50 border border-border rounded-lg p-3 text-sm">
                    <span className="text-muted-foreground">💬 </span>
                    <span className="font-mono">"pay 100 USDC to 0x123..."</span>
                  </div>
                  <div className="text-left bg-muted/50 border border-border rounded-lg p-3 text-sm">
                    <span className="text-muted-foreground">💬 </span>
                    <span className="font-mono">"check my balance"</span>
                  </div>
                  <div className="text-left bg-muted/50 border border-border rounded-lg p-3 text-sm">
                    <span className="text-muted-foreground">💬 </span>
                    <span className="font-mono">"transfer 50 USDC to Alice"</span>
                  </div>
                </div>
              </div>
            )}
            <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2.5 transition-all duration-200',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted border border-border-subtle'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {message.role === 'user' ? 'You' : 'Agent'}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.toolCalls.map((call, idx) => {
                        // Check if this is a payment link creation
                        const isPaymentLink = call.tool === 'create_payment_link';
                        const paymentLinkUrl = call.output && typeof call.output === 'object' && 'intent' in call.output
                          ? (call.output as any).intent?.payment_link?.url
                          : null;
                        
                        return (
                          <div key={idx} className="rounded-md border border-border bg-background p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                {call.tool}
                              </code>
                              {call.output && (
                                <CheckCircle className="h-3 w-3 text-success" />
                              )}
                            </div>
                            {isPaymentLink && paymentLinkUrl && (
                              <div className="mb-2 p-2 bg-primary/10 rounded border border-primary/20">
                                <p className="text-xs font-medium mb-1">Payment Link Created:</p>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs font-mono flex-1 break-all">
                                    {paymentLinkUrl}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => {
                                      navigator.clipboard.writeText(paymentLinkUrl);
                                      toast.success('Payment link copied!');
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => window.open(paymentLinkUrl, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            {call.output && (
                              <JsonViewer data={call.output} className="text-xs" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 ring-1 ring-border">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </motion.div>
            ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted border border-border-subtle rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </motion.div>
            )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Premium Composer */}
            <div className="border-t border-border p-4 bg-background-elevated">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your query, e.g., 'pay 100 USDC to 0x123...' or 'check my balance'"
                  className="flex-1 bg-background"
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!input.trim() || isTyping}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Pending Approval */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex flex-col space-y-4 shrink-0">
            {pendingIntent && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Approval Required</h3>
                    <StatusChip status={pendingIntent.status} />
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-lg font-semibold">${pendingIntent.amount.toLocaleString()} {pendingIntent.currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Recipient</p>
                      <p className="text-sm font-medium">{pendingIntent.recipient}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm">{pendingIntent.description}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3 mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Guard Results</p>
                    {pendingIntent.guardResults.map((result, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-1">
                        <span>{result.guardName}</span>
                        {result.passed ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Reject
                    </Button>
                    <Button className="flex-1">
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Check balances', action: 'Check my wallet balances' },
                    { label: 'Recent transactions', action: 'Show recent transactions' },
                    { label: 'List wallets', action: 'List all my wallets' },
                  ].map((action, index) => (
                    <motion.div
                      key={action.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start hover:bg-accent transition-all duration-200" 
                        onClick={() => {
                          const quickMessage: ChatMessage = {
                            id: `msg_${Date.now()}`,
                            role: 'user',
                            content: action.action,
                            timestamp: new Date().toISOString(),
                          };
                          setMessages(prev => [...prev, quickMessage]);
                          handleQuickAction(action.action);
                        }}
                      >
                        {action.label}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {!geminiService.isConfigured() && (
              <Card className="border-yellow-500/50 bg-yellow-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1 text-yellow-600">Gemini Not Configured</h3>
                      <p className="text-xs text-yellow-600/80">
                        Set VITE_GEMINI_API_KEY in your .env file to enable AI agent features.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Command Terminal - Below Quick Actions */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden mt-4">
            <CommandTerminal className="h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
