import { useState, useRef, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { StatusChip } from '@/components/StatusChip';
import { JsonViewer } from '@/components/JsonViewer';
import { CommandTerminal } from '@/components/CommandTerminal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Bot, User, CheckCircle, XCircle, Loader2, AlertCircle, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import type { ChatMessage, PaymentIntent, Transaction } from '@/types';
import { paymentsService } from '@/services/payments';
import { geminiService } from '@/services/gemini';
import { cn } from '@/lib/utils';
import { ensureUserInSupabase } from '@/lib/supabase';
import { saveChatMessages, loadChatMessages, clearChatMessages } from '@/services/supabase/chats';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Lazy load AgentOrb to reduce initial bundle size
const AgentOrb = lazy(() => import('@/components/AgentOrb').then(module => ({ default: module.AgentOrb })));

// Memoized ChatMessage component to prevent unnecessary re-renders
const ChatMessageItem = memo(({ message, index }: { message: ChatMessage; index: number }) => {
  const paymentLinkCall = useMemo(() => 
    message.toolCalls?.find(call => call.tool === 'create_payment_link'),
    [message.toolCalls]
  );
  
  const paymentLinkUrl = useMemo(() => {
    if (!paymentLinkCall?.output || typeof paymentLinkCall.output !== 'object') return null;
    return 'intent' in paymentLinkCall.output 
      ? (paymentLinkCall.output as any).intent?.payment_link?.url 
      : null;
  }, [paymentLinkCall]);

  const formattedTime = useMemo(
    () => formatDistanceToNow(new Date(message.timestamp), { addSuffix: true }),
    [message.timestamp]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.01, 0.3) }}
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
          'max-w-[80%] rounded-xl px-4 py-2.5 transition-all duration-200',
          message.role === 'user'
            ? 'bg-[hsl(var(--success))] text-white'
            : 'bg-[rgba(255,255,255,0.03)] border border-border/30'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {message.role === 'user' ? 'You' : 'Agent'}
          </span>
          <span className="text-xs text-muted-foreground/70">
            {formattedTime}
          </span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        
        {paymentLinkUrl && (
          <div className="mt-3">
            <div className="rounded-md border border-border bg-background p-3">
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
          </div>
        )}
      </div>
      {message.role === 'user' && (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 ring-1 ring-border">
          <User className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
});

ChatMessageItem.displayName = 'ChatMessageItem';

export default function AgentChatPage() {
  const queryClient = useQueryClient();
  const { wallets: privyWallets } = useWallets();
  const { user, authenticated } = usePrivy();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<PaymentIntent | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  const [executionStatus, setExecutionStatus] = useState<{
    step: string;
    message: string;
    intentId?: string;
  } | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<Array<{
    id: string;
    timestamp: Date;
    type: 'command' | 'output' | 'error';
    content: string;
  }>>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  
  // Get default wallet and chain from Privy (memoized)
  const defaultWalletId = useMemo(
    () => privyWallets.length > 0 ? privyWallets[0].address : undefined,
    [privyWallets]
  );
  const defaultChain = 'arc-testnet';
  
  // Memoize wallet addresses array
  const privyWalletAddresses = useMemo(
    () => privyWallets.map(w => w.address),
    [privyWallets]
  );

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

        // Load chat history from Supabase in parallel with pending intent
        // Limit to last 100 messages for better performance
        const [savedMessages] = await Promise.all([
          loadChatMessages(userId, { limit: 100 }),
          loadPendingIntent(), // Load in parallel
        ]);

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
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, user, privyWallets]);

  // Save messages to Supabase whenever they change (optimized with longer debounce)
  useEffect(() => {
    if (isInitializedRef.current && messages.length > 0 && supabaseUserId) {
      // Increased debounce to 2 seconds to reduce database calls
      // Only save if messages actually changed (not just re-render)
      const timeoutId = setTimeout(() => {
        saveChatMessages(supabaseUserId, messages).catch((error) => {
          console.error('Failed to save chat messages:', error);
        });
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, supabaseUserId]); // Only depend on length, not full messages array

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

      // Get conversation messages before adding user message
      const conversationMessages = messages.filter(msg => msg.id !== 'welcome');
      
      // Add user message to chat immediately
      setMessages((prev) => [...prev, userMessage]);

      // Build current messages array with user message included
      const currentMessages = [...conversationMessages, userMessage];
      const response = await geminiService.chat(currentMessages, {
        defaultWalletId,
        defaultChain,
        privyUserId: user?.id,
        privyWalletAddresses,
      });

      // Check if this is a payment intent creation - check for duplicates BEFORE creating assistant message
      const paymentIntentCall = response.toolCalls?.find(tc => tc.tool === 'create_payment_intent');
      let paymentAlreadyCompleted = false;
      let duplicateTransaction: Transaction | null = null;
      
      if (paymentIntentCall && paymentIntentCall.output && typeof paymentIntentCall.output === 'object') {
        const intentOutput = paymentIntentCall.output as any;
        const amount = paymentIntentCall.input.amount as number;
        const recipientAddress = paymentIntentCall.input.recipientAddress as string;
        
        // Check if a similar payment was already completed recently (within last 5 minutes)
        try {
          const recentTransactions = await paymentsService.getTransactions({ limit: 10 });
          const recentDuplicate = recentTransactions.find(tx => 
            tx.recipientAddress?.toLowerCase() === recipientAddress?.toLowerCase() &&
            Math.abs(tx.amount - amount) < 0.01 && // Same amount (within 0.01 tolerance)
            tx.status === 'succeeded' &&
            new Date(tx.createdAt).getTime() > Date.now() - 5 * 60 * 1000 // Within last 5 minutes
          );
          
          if (recentDuplicate) {
            paymentAlreadyCompleted = true;
            duplicateTransaction = recentDuplicate;
          }
        } catch (error) {
          console.error('[AgentChat] Error checking for duplicate payments:', error);
          // Continue with execution if check fails
        }
      }

      // Create assistant message - override content if payment was already completed
      let assistantContent = response.content;
      if (paymentAlreadyCompleted && duplicateTransaction) {
        assistantContent = `✅ This payment was already completed ${formatDistanceToNow(new Date(duplicateTransaction.createdAt), { addSuffix: true })}.\n\nAmount: ${duplicateTransaction.amount} USDC\nRecipient: ${duplicateTransaction.recipientAddress?.slice(0, 6)}...${duplicateTransaction.recipientAddress?.slice(-4)}${duplicateTransaction.txHash ? `\nTransaction: ${duplicateTransaction.txHash.slice(0, 10)}...` : ''}`;
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        toolCalls: response.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If payment was already completed, show notification and return early
      if (paymentAlreadyCompleted && duplicateTransaction) {
        if (duplicateTransaction.txHash) {
          const explorerUrl = duplicateTransaction.metadata?.explorerUrl || `https://testnet.arcscan.app/tx/${duplicateTransaction.txHash}`;
          toast.info('Payment Already Completed', {
            description: `This payment was completed ${formatDistanceToNow(new Date(duplicateTransaction.createdAt), { addSuffix: true })}`,
            action: {
              label: 'View Transaction',
              onClick: () => window.open(explorerUrl, '_blank'),
            },
          });
        }
        // Don't proceed with execution if duplicate found
        return;
      }

      // Log all tool calls to terminal (technical details)
      // Full JSON/code outputs go to terminal, English summaries stay in chat
      if (response.toolCalls && response.toolCalls.length > 0) {
        response.toolCalls.forEach((call) => {
          const timestamp = new Date().toISOString().substring(11, 19);
          
          // Format tool output for terminal
          let outputContent = 'No output';
          if (call.output) {
            if (typeof call.output === 'object') {
              outputContent = JSON.stringify(call.output, null, 2);
            } else {
              outputContent = String(call.output);
            }
          }
          
          // Format for terminal: Tool name with checkmark, then formatted output
          const toolName = call.tool.replace(/_/g, ' ');
          const logContent = `[${timestamp}] ✓ ${toolName}\n\n${outputContent}`;
          
          setTerminalLogs((prev) => [
            ...prev,
            {
              id: `term_tool_${Date.now()}_${Math.random()}`,
              timestamp: new Date(),
              type: 'output',
              content: logContent,
            },
          ]);
        });
      }

      if (response.toolCalls?.some(tc => 
        ['create_payment_intent', 'approve_payment', 'execute_payment'].includes(tc.tool)
      )) {
        await loadPendingIntent();
        // Invalidate transactions query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
      
      // Add error message to chat
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
  }, [messages, isTyping, loadPendingIntent, defaultWalletId, defaultChain, privyWalletAddresses, user?.id, queryClient]);

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
        privyWalletAddresses,
      });

      // Check if this is a payment intent creation - check for duplicates BEFORE creating assistant message
      const paymentIntentCall = response.toolCalls?.find(tc => tc.tool === 'create_payment_intent');
      let paymentAlreadyCompleted = false;
      let duplicateTransaction: Transaction | null = null;
      
      if (paymentIntentCall && paymentIntentCall.output && typeof paymentIntentCall.output === 'object') {
        const intentOutput = paymentIntentCall.output as any;
        const amount = paymentIntentCall.input.amount as number;
        const recipientAddress = paymentIntentCall.input.recipientAddress as string;
        
        // Check if a similar payment was already completed recently (within last 5 minutes)
        try {
          const recentTransactions = await paymentsService.getTransactions({ limit: 10 });
          const recentDuplicate = recentTransactions.find(tx => 
            tx.recipientAddress?.toLowerCase() === recipientAddress?.toLowerCase() &&
            Math.abs(tx.amount - amount) < 0.01 && // Same amount (within 0.01 tolerance)
            tx.status === 'succeeded' &&
            new Date(tx.createdAt).getTime() > Date.now() - 5 * 60 * 1000 // Within last 5 minutes
          );
          
          if (recentDuplicate) {
            paymentAlreadyCompleted = true;
            duplicateTransaction = recentDuplicate;
          }
        } catch (error) {
          console.error('[AgentChat] Error checking for duplicate payments:', error);
          // Continue with execution if check fails
        }
      }

      // Create assistant message - override content if payment was already completed
      let assistantContent = response.content;
      if (paymentAlreadyCompleted && duplicateTransaction) {
        assistantContent = `✅ This payment was already completed ${formatDistanceToNow(new Date(duplicateTransaction.createdAt), { addSuffix: true })}.\n\nAmount: ${duplicateTransaction.amount} USDC\nRecipient: ${duplicateTransaction.recipientAddress?.slice(0, 6)}...${duplicateTransaction.recipientAddress?.slice(-4)}${duplicateTransaction.txHash ? `\nTransaction: ${duplicateTransaction.txHash.slice(0, 10)}...` : ''}`;
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        toolCalls: response.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If payment was already completed, show notification and return early
      if (paymentAlreadyCompleted && duplicateTransaction) {
        if (duplicateTransaction.txHash) {
          const explorerUrl = duplicateTransaction.metadata?.explorerUrl || `https://testnet.arcscan.app/tx/${duplicateTransaction.txHash}`;
          toast.info('Payment Already Completed', {
            description: `This payment was completed ${formatDistanceToNow(new Date(duplicateTransaction.createdAt), { addSuffix: true })}`,
            action: {
              label: 'View Transaction',
              onClick: () => window.open(explorerUrl, '_blank'),
            },
          });
        }
        // Don't proceed with execution if duplicate found
        return;
      }

      // Log all tool calls to terminal (technical details)
      // Full JSON/code outputs go to terminal, English summaries stay in chat
      if (response.toolCalls && response.toolCalls.length > 0) {
        response.toolCalls.forEach((call) => {
          const timestamp = new Date().toISOString().substring(11, 19);
          
          // Format tool output for terminal
          let outputContent = 'No output';
          if (call.output) {
            if (typeof call.output === 'object') {
              outputContent = JSON.stringify(call.output, null, 2);
            } else {
              outputContent = String(call.output);
            }
          }
          
          // Format for terminal: Tool name with checkmark, then formatted output
          const toolName = call.tool.replace(/_/g, ' ');
          const logContent = `[${timestamp}] ✓ ${toolName}\n\n${outputContent}`;
          
          setTerminalLogs((prev) => [
            ...prev,
            {
              id: `term_tool_${Date.now()}_${Math.random()}`,
              timestamp: new Date(),
              type: 'output',
              content: logContent,
            },
          ]);
        });
      }

      // Check if this is a payment intent creation - trigger auto-execution
      if (paymentIntentCall && paymentIntentCall.output && typeof paymentIntentCall.output === 'object') {
        const intentOutput = paymentIntentCall.output as any;
        const intentId = intentOutput.id;
        const shouldAutoExecute = intentOutput.autoExecute;
        
        // Extract payment parameters from tool call for auto-execution flow
        const amount = paymentIntentCall.input.amount as number;
        const recipientAddress = paymentIntentCall.input.recipientAddress as string;
        const recipient = paymentIntentCall.input.recipient as string;
        const description = paymentIntentCall.input.description as string;

        // Get agent wallet ID - use the one from the intent output if available
        let agentWalletId = intentOutput.walletId || intentOutput.fromWallet?.ref;
        
        // If no wallet ID in output, fetch the user's agent wallet
        if (!agentWalletId && user?.id) {
          try {
            const { agentWalletService } = await import('@/services/wallets');
            const userAgentWallet = await agentWalletService.getAgentWallet(user.id);
            if (userAgentWallet?.walletId) {
              agentWalletId = userAgentWallet.walletId;
              console.log('[AgentChat] Using user agent wallet:', agentWalletId);
            }
          } catch (error) {
            console.error('[AgentChat] Failed to fetch user agent wallet:', error);
          }
        }

        // Trigger auto-execution if we have the required parameters and intent ID
        if (shouldAutoExecute && agentWalletId && amount && recipientAddress && intentId) {
          console.log('[AgentChat] Auto-execution triggered:', { intentId, amount, agentWalletId, walletSource: intentOutput.walletId ? 'intent' : 'fetched' });
          // Trigger auto-execution flow
          const statusMessageId = `status_${Date.now()}`;
          try {
            // Check if payment was already completed before showing processing status
            const existingIntent = await paymentsService.getIntent(intentId);
            const isAlreadyCompleted = existingIntent?.status === 'succeeded' && existingIntent?.txHash;
            
            if (isAlreadyCompleted) {
              // Payment already completed - show completion message instead of processing
              const completedMessage: ChatMessage = {
                id: statusMessageId,
                role: 'assistant',
                content: `✅ Payment already completed: ${amount} USDC to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}${existingIntent.txHash ? `\n\nTransaction: ${existingIntent.txHash.slice(0, 10)}...` : ''}`,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, completedMessage]);
              
              if (existingIntent.txHash) {
                const explorerUrl = existingIntent.metadata?.explorerUrl || `https://testnet.arcscan.app/tx/${existingIntent.txHash}`;
                addNotification({
                  type: 'payment',
                  title: 'Payment Already Completed',
                  message: `Sent ${amount} USDC to ${recipientAddress.slice(0, 10)}...`,
                  txHash: existingIntent.txHash,
                  explorerUrl,
                });
              }
              
              // Invalidate transactions query to refresh the list
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              return; // Don't execute again
            }
            
            // Add status message to chat only if not already completed
            const statusMessage: ChatMessage = {
              id: statusMessageId,
              role: 'assistant',
              content: '• Creating payment intent…\n• Evaluating guardrails…\n• Executing gasless transfer…',
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, statusMessage]);
            setExecutionStatus({ step: 'executing', message: '⚡ Executing payment…', intentId });

            // Execute the existing intent directly instead of creating a new one
            const executeResult = await paymentsService.executeIntent(intentId);
            
            if (executeResult.success) {
              // Invalidate transactions query to refresh the list
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              
              // Update status message
              setMessages((prev) => {
                const updated = prev.map(msg => 
                  msg.id === statusMessageId 
                    ? { ...msg, content: `✅ Paid ${amount} USDC to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}` }
                    : msg
                );
                return updated;
              });
              
              setExecutionStatus({
                step: 'completed',
                message: `✅ Payment completed`,
                intentId,
              });

              // Show notification when payment completes
              if (executeResult.txHash) {
                const explorerUrl = `https://testnet.arcscan.app/tx/${executeResult.txHash}`;
                
                // Add to notification center
                addNotification({
                  type: 'payment',
                  title: 'Payment Completed',
                  message: `Sent ${amount} USDC to ${recipientAddress.slice(0, 10)}...`,
                  txHash: executeResult.txHash,
                  explorerUrl,
                });
                
                // Show toast notification
                toast.success('Payment Completed ✅', {
                  description: (
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">Sent {amount} USDC</span>
                      <a 
                        href={explorerUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline text-xs break-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🔗 testnet.arcscan.app/tx/{executeResult.txHash}
                      </a>
                    </div>
                  ),
                  duration: 5000,
                  action: {
                    label: 'View',
                    onClick: () => window.open(explorerUrl, '_blank'),
                  },
                });
              }

              // Reload pending intent after execution and refresh intent list
              await loadPendingIntent();
              // Small delay to ensure backend has updated the intent status
              setTimeout(async () => {
                await loadPendingIntent();
              }, 500);
            } else {
              // Execution failed
              setMessages((prev) => {
                const updated = prev.map(msg => 
                  msg.id === statusMessageId 
                    ? { ...msg, content: `⚠️ Payment execution failed: ${executeResult.error || executeResult.message || 'Unknown error'}` }
                    : msg
                );
                return updated;
              });
              
              setExecutionStatus({
                step: 'failed',
                message: `⚠️ Payment execution failed`,
                intentId,
              });
              
              toast.error('Payment execution failed', {
                description: executeResult.error || executeResult.message || 'Please try again.',
              });
            }
          } catch (error) {
            console.error('Auto-execution failed:', error);
            // Update status message to show error
            setMessages((prev) => {
              const updated = prev.map(msg => 
                msg.id === statusMessageId 
                  ? { ...msg, content: '⚠️ Payment requires manual approval. Please review the payment intent.' }
                  : msg
              );
              return updated;
            });
            
            setExecutionStatus({
              step: 'failed',
              message: '⚠️ Payment execution failed',
              intentId,
            });
            
            toast.error('Payment execution failed', {
              description: error instanceof Error ? error.message : 'Please try again.',
            });
          }
        } else if (shouldAutoExecute && agentWalletId && amount && recipientAddress && !intentId) {
          // Fallback: If intent ID is missing, use the old flow
          console.log('[AgentChat] Auto-execution triggered (fallback flow):', { amount, agentWalletId });
          const statusMessageId = `status_${Date.now()}`;
          try {
            const statusMessage: ChatMessage = {
              id: statusMessageId,
              role: 'assistant',
              content: '• Simulating payment intent…\n• Evaluating guardrails…\n• Checking compliance…',
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, statusMessage]);
            setExecutionStatus({ step: 'simulating', message: '🟡 Simulating payment…' });

            // Execute auto-execution flow using the created intent
            const flowGenerator = paymentsService.executeAgentPaymentFlow({
              amount,
              recipient: recipient || recipientAddress,
              recipientAddress,
              description,
              walletId: agentWalletId,
              chain: defaultChain,
              currency: 'USD',
            });

            // Process streaming updates
            for await (const status of flowGenerator) {
              // Update chat message with human-friendly status
              setMessages((prev) => {
                const updated = prev.map(msg => 
                  msg.id === statusMessageId 
                    ? { ...msg, content: status.message }
                    : msg
                );
                return updated;
              });
              setExecutionStatus({
                step: status.step,
                message: status.message,
                intentId: status.intentId || intentId,
              });

              // Show notification when payment completes
              if (status.step === 'completed' && status.technicalDetails?.output) {
                // Invalidate transactions query to refresh the list
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                
                const output = status.technicalDetails.output as any;
                const txHash = output.tx_hash || output.blockchain_tx;
                if (txHash) {
                  const explorerUrl = `https://testnet.arcscan.app/tx/${txHash}`;
                  
                  // Add to notification center
                  addNotification({
                    type: 'payment',
                    title: 'Payment Completed',
                    message: `Sent ${amount} USDC to ${recipientAddress.slice(0, 10)}...`,
                    txHash,
                    explorerUrl,
                  });
                  
                  // Show toast notification (5 seconds, or until user closes it)
                  toast.success('Payment Completed ✅', {
                    description: (
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">Sent {amount} USDC</span>
                        <a 
                          href={explorerUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline text-xs break-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          🔗 testnet.arcscan.app/tx/{txHash}
                        </a>
                      </div>
                    ),
                    duration: 5000,
                    action: {
                      label: 'View',
                      onClick: () => window.open(explorerUrl, '_blank'),
                    },
                  });
                }
              }

              // Add technical details to terminal
              if (status.technicalDetails) {
                const tool = status.technicalDetails.tool;
                const input = status.technicalDetails.input;
                const output = status.technicalDetails.output;
                const error = status.technicalDetails.error;

                const timestamp = new Date().toISOString().substring(11, 19) + ' UTC';
                const logContent = error
                  ? `[${timestamp}] [ERROR] ${tool}\nInput: ${JSON.stringify(input, null, 2)}\nError: ${error}`
                  : `[${timestamp}] [${status.step.toUpperCase()}] ${tool}\nInput: ${JSON.stringify(input, null, 2)}\n${output ? `Output: ${JSON.stringify(output, null, 2)}` : ''}`;

                setTerminalLogs((prev) => [
                  ...prev,
                  {
                    id: `term_${Date.now()}_${Math.random()}`,
                    timestamp: new Date(),
                    type: error ? 'error' : 'output',
                    content: logContent,
                  },
                ]);
              }
            }

            // Reload pending intent after execution
            await loadPendingIntent();
          } catch (error) {
            console.error('Auto-execution failed:', error);
            // Update status message to show error
            setMessages((prev) => {
              const updated = prev.map(msg => 
                msg.id === statusMessageId 
                  ? { ...msg, content: '⚠️ Payment requires manual approval. Please review the payment intent.' }
                  : msg
              );
              return updated;
            });
          }
        }
      }

      // Reload pending intent if payment was created/approved
      if (response.toolCalls?.some(tc => 
        ['create_payment_intent', 'approve_payment', 'execute_payment'].includes(tc.tool)
      )) {
        await loadPendingIntent();
        // Invalidate transactions query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
    } catch (error) {
      console.error('Gemini chat error:', error);
      console.error('Error details:', error);
      
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
  }, [input, messages.length, isTyping, loadPendingIntent, defaultWalletId, defaultChain, privyWalletAddresses, user?.id, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = useCallback(async () => {
    setShowClearDialog(true);
  }, []);

  const confirmClearHistory = useCallback(async () => {
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
      setShowClearDialog(false);
      toast.success('Chat history cleared');
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast.error('Failed to clear chat history');
    }
  }, [supabaseUserId]);


  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <PageHeader 
        title="Agent Chat" 
        description="Interact with your payment agent"
        actions={
          messages.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear History
              </Button>
              <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to clear the chat history? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmClearHistory}>
                      Clear History
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )
        }
      />

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chat Area - Narrower Left Container */}
        <div className="w-[500px] flex flex-col min-h-0 relative shrink-0">
          {/* Three.js Orb Background - Lazy loaded */}
          <div className="absolute top-0 right-0 w-64 h-64 -z-10">
            <Suspense fallback={null}>
              <AgentOrb />
            </Suspense>
          </div>
          
          <div className="flex-1 flex flex-col border border-border/50 rounded-xl bg-card overflow-hidden min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ willChange: 'transform' }}>
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
            <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <ChatMessageItem key={message.id} message={message} index={index} />
            ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center border border-border/30">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="bg-[rgba(255,255,255,0.03)] border border-border/30 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Processing...</span>
                  </div>
                </div>
              </motion.div>
            )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Operator Console Style */}
            <div className="border-t border-border/50 p-4 bg-background">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your query, e.g., 'pay 100 USDC to 0x123...' or 'check my balance'"
                  className="flex-1 bg-background border-border/50 focus-visible:border-border"
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!input.trim() || isTyping}
                  size="icon"
                  className="shrink-0 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
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
                        onClick={() => handleQuickAction(action.action)}
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
            <CommandTerminal className="h-full" externalLogs={terminalLogs} />
          </div>
        </div>
      </div>
    </div>
  );
}
