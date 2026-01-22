import { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { cn } from '@/lib/utils';
import { walletsService } from '@/services/wallets';
import { paymentsService } from '@/services/payments';
import { guardsService } from '@/services/guards';

interface TerminalLog {
  id: string;
  timestamp: Date;
  type: 'command' | 'output' | 'error';
  content: string;
}

interface CommandTerminalProps {
  className?: string;
  externalLogs?: Array<{
    id: string;
    timestamp: Date;
    type: 'command' | 'output' | 'error';
    content: string;
  }>;
}

export function CommandTerminal({ className, externalLogs = [] }: CommandTerminalProps) {
  const { wallets: privyWallets } = useWallets();
  const [logs, setLogs] = useState<TerminalLog[]>([
    {
      id: 'welcome',
      timestamp: new Date(),
      type: 'output',
      content: 'OmniAgentPay Execution Console v1.0.0\nControlled execution interface for agentic payments.\nType "help" for available commands.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs.length]); // Scroll when logs change

  // Merge external logs into local logs
  // Track processed log IDs to avoid duplicates
  const processedLogIdsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (externalLogs && externalLogs.length > 0) {
      setLogs((prev) => {
        // Find logs that haven't been processed yet
        const newLogs = externalLogs.filter(log => {
          if (processedLogIdsRef.current.has(log.id)) {
            return false; // Already processed
          }
          processedLogIdsRef.current.add(log.id); // Mark as processed
          return true;
        });
        
        if (newLogs.length > 0) {
          // Scroll to bottom after adding new logs
          setTimeout(() => scrollToBottom(), 100);
          return [...prev, ...newLogs];
        }
        return prev;
      });
    }
  }, [externalLogs]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const addLog = (type: TerminalLog['type'], content: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date(),
        type,
        content,
      },
    ]);
  };

  const formatOutput = (agent: string, tool: string, content: string): string => {
    const now = new Date();
    const utcTime = now.toISOString().substring(11, 19) + ' UTC';
    return `Agent: ${agent}\nTool: ${tool}\nTime: ${utcTime}\n\n${content}`;
  };

  const executeCommand = async (command: string): Promise<string> => {
    const trimmed = command.trim();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Add to history
    if (trimmed && (history.length === 0 || history[history.length - 1] !== trimmed)) {
      setHistory((prev) => [...prev, trimmed]);
    }
    setHistoryIndex(-1);

    switch (cmd) {
      case 'help':
        return formatOutput(
          'payment-agent-01',
          'help',
          `Available Commands:

CORE AGENT / PAYMENT COMMANDS:
  simulate <amount> <token> <target>  Simulate payment intent
  pay <intent_id>                     Execute previously simulated intent
  explain <intent_id>                 Explain why payment happened or was blocked
  history                             List recent payment intents with status

GUARD & SAFETY COMMANDS:
  guards                              List active guard policies
  check <amount>                     What-if guard evaluation (no intent created)

WALLET & NETWORK COMMANDS:
  balance                             Fetch real balances from agent wallet
  networks                            Show supported chains
  recent                              Show recent transactions

UTILITY:
  help                                Show this help message
  clear                               Clear terminal output`
        );

      case 'balance':
        try {
          // Get Privy wallet addresses
          const walletAddresses = privyWallets.map(pw => pw.address);
          
          if (walletAddresses.length === 0) {
            return formatOutput(
              'payment-agent-01',
              'balance',
              'No wallet connected.\n\nPlease connect a wallet using Privy to view balances.'
            );
          }
          
          // Fetch wallets with Privy addresses
          const wallets = await walletsService.getWallets(walletAddresses);
          
          if (wallets.length === 0) {
            // Try to fetch balance directly for the first wallet
            const firstWallet = privyWallets[0];
            if (firstWallet) {
              try {
                const balance = await walletsService.getWalletBalance(firstWallet.address);
                if (balance) {
                  const usdcToken = balance.tokens.find(t => t.currency === 'USDC');
                  return formatOutput(
                    'payment-agent-01',
                    'balance',
                    `Agent Wallet (Privy)
Address: ${firstWallet.address.substring(0, 10)}...${firstWallet.address.substring(38)}
Chain: ARC Testnet
  
Balances:
  Native: ${balance.native.amount} ${balance.native.currency}
  USDC: ${usdcToken?.amount || '0.00'} USDC
  
Connected via Privy — execution handled by backend agents.`
                  );
                }
              } catch (error) {
                console.error('Failed to fetch balance:', error);
              }
            }
            return formatOutput(
              'payment-agent-01',
              'balance',
              'Wallet connected but balance unavailable.\n\nPlease check your wallet connection.'
            );
          }
          
          // Display all wallets
          let output = 'Agent Wallets:\n\n';
          wallets.forEach(w => {
            output += `${w.name} (${w.chain})\n`;
            output += `  Address: ${w.address.substring(0, 10)}...${w.address.substring(38)}\n`;
            output += `  USDC: ${w.balance.usdc.toFixed(2)} USDC\n`;
            output += `  Native: ${w.balance.native.toFixed(4)} USDC\n\n`;
          });
          return formatOutput('payment-agent-01', 'balance', output.trim());
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'balance',
            `Error: ${error instanceof Error ? error.message : 'Failed to fetch balances'}\n\nPlease ensure your wallet is connected via Privy.`
          );
        }

      case 'recent':
        try {
          const transactions = await paymentsService.getTransactions({ limit: 5 });
          if (transactions.length === 0) {
            return formatOutput('payment-agent-01', 'recent', 'No recent transactions found.');
          }
          
          let output = 'Recent Transactions:\n\n';
          transactions.forEach((tx, idx) => {
            const date = new Date(tx.createdAt).toLocaleString();
            const status = tx.status === 'succeeded' ? '✓' : tx.status === 'failed' ? '✗' : '○';
            output += `${idx + 1}. [${date}] ${tx.type} ${tx.amount} ${tx.currency} ${tx.recipient ? `to ${tx.recipient.substring(0, 10)}...` : ''} ${status}\n`;
          });
          return formatOutput('payment-agent-01', 'recent', output.trim());
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'recent',
            `Error: ${error instanceof Error ? error.message : 'Failed to fetch transactions'}`
          );
        }

      case 'list':
        // Handle "list tr" or "list transactions"
        if (args.length > 0 && (args[0] === 'tr' || args[0] === 'transactions')) {
          try {
            const limit = args[1] ? parseInt(args[1], 10) : undefined;
            const transactions = await paymentsService.getTransactions({ limit: limit || 10 });
            // Return as JSON array for "list tr" command
            return formatOutput('payment-agent-01', 'list', JSON.stringify(transactions.map(tx => ({
              id: tx.id,
              intentId: tx.intentId,
              amount: tx.amount,
              currency: tx.currency,
              recipient: tx.recipientAddress,
              status: tx.status,
              txHash: tx.txHash,
              createdAt: tx.createdAt,
            })), null, 2));
          } catch (error) {
            return formatOutput(
              'payment-agent-01',
              'list',
              `Error: ${error instanceof Error ? error.message : 'Failed to fetch transactions'}`
            );
          }
        }
        return formatOutput('payment-agent-01', 'list', 'Usage: list tr [limit]\nExample: list tr 10');

      case 'tr':
        try {
          const limit = args.length > 0 ? parseInt(args[0], 10) : 10;
          const transactions = await paymentsService.getTransactions({ limit });
          // Return as JSON array
          return formatOutput('payment-agent-01', 'tr', JSON.stringify(transactions.map(tx => ({
            id: tx.id,
            intentId: tx.intentId,
            amount: tx.amount,
            currency: tx.currency,
            recipient: tx.recipientAddress,
            status: tx.status,
            txHash: tx.txHash,
            createdAt: tx.createdAt,
          })), null, 2));
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'tr',
            `Error: ${error instanceof Error ? error.message : 'Failed to fetch transactions'}`
          );
        }

      case 'simulate': {
        if (args.length < 3) {
          return formatOutput(
            'payment-agent-01',
            'simulate',
            'Error: Invalid arguments.\nUsage: simulate <amount> <token> <target>\nExample: simulate 100 usdc 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
          );
        }
        const amount = parseFloat(args[0]);
        const token = args[1].toUpperCase();
        const target = args[2];
        
        if (isNaN(amount) || amount <= 0) {
          return formatOutput('payment-agent-01', 'simulate', 'Error: Invalid amount. Must be a positive number.');
        }
        
        try {
          // Create intent and simulate
          const intent = await paymentsService.createIntent({
            amount,
            recipient: target,
            recipientAddress: target,
            description: `Terminal simulation: ${amount} ${token} to ${target.substring(0, 10)}...`,
            walletId: 'wallet_circle_agent_001',
            chain: 'arc-testnet',
          });
          
          const simResult = await paymentsService.simulateIntent(intent.id);
          
          return formatOutput(
            'payment-agent-01',
            'simulate',
            `Payment Intent Created
Intent ID: ${intent.id}
Amount: ${amount} ${token}
Target: ${target.substring(0, 20)}...

Guard Decision: ${simResult.guardResults?.every((g: any) => g.passed) ? 'ALLOWED' : 'BLOCKED'}
Estimated Fee: ${simResult.estimatedFee || 0} ${token}
Selected Route: ${simResult.route || 'auto'}

${simResult.requiresApproval ? '⚠️  Requires approval before execution.' : 'Ready to execute with "pay" command.'}`
          );
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'simulate',
            `Error: ${error instanceof Error ? error.message : 'Failed to simulate payment'}`
          );
        }
      }

      case 'pay': {
        if (args.length === 0) {
          return formatOutput('payment-agent-01', 'pay', 'Error: Please specify intent_id.\nUsage: pay <intent_id>');
        }
        const intentId = args[0];
        
        try {
          const intent = await paymentsService.getIntent(intentId);
          if (!intent) {
            return formatOutput('payment-agent-01', 'pay', `Error: Intent ${intentId} not found.`);
          }
          
          if (intent.status === 'blocked') {
            return formatOutput(
              'payment-agent-01',
              'pay',
              `Payment Blocked
Intent ID: ${intentId}
Reason: Guard evaluation failed

Guard Results:
${intent.guardResults.map(g => `  ${g.guardName}: ${g.passed ? 'PASS' : 'FAIL'}${g.reason ? ` (${g.reason})` : ''}`).join('\n')}`
            );
          }
          
          const result = await paymentsService.executeIntent(intentId);
          
          return formatOutput(
            'payment-agent-01',
            'pay',
            `Payment Execution ${result.success ? 'Initiated' : 'Failed'}
Intent ID: ${intentId}
${result.txHash ? `Transaction Hash: ${result.txHash}` : 'Status: Processing...'}

Note: Execution is handled by backend agents. This is a controlled interface.`
          );
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'pay',
            `Error: ${error instanceof Error ? error.message : 'Failed to execute payment'}`
          );
        }
      }

      case 'explain':
        if (args.length === 0) {
          return formatOutput('payment-agent-01', 'explain', 'Error: Please specify intent_id.\nUsage: explain <intent_id>');
        }
        try {
          const explanation = await paymentsService.getExplanation(args[0]);
          return formatOutput(
            'payment-agent-01',
            'explain',
            `Payment Explanation
Intent ID: ${args[0]}

${JSON.stringify(explanation, null, 2)}`
          );
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'explain',
            `Error: ${error instanceof Error ? error.message : 'Failed to get explanation'}`
          );
        }

      case 'history':
        try {
          const intents = await paymentsService.getIntents();
          const recent = intents.slice(0, 10);
          
          if (recent.length === 0) {
            return formatOutput('payment-agent-01', 'history', 'No payment intents found.');
          }
          
          let output = 'Recent Payment Intents:\n\n';
          recent.forEach((intent, idx) => {
            const date = new Date(intent.createdAt).toLocaleString();
            output += `${idx + 1}. [${date}] ${intent.amount} ${intent.currency} - ${intent.status.toUpperCase()}\n`;
            output += `   ID: ${intent.id}\n`;
            if (intent.agentName) output += `   Agent: ${intent.agentName}\n`;
            output += '\n';
          });
          return formatOutput('payment-agent-01', 'history', output.trim());
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'history',
            `Error: ${error instanceof Error ? error.message : 'Failed to fetch history'}`
          );
        }

      case 'guards':
        try {
          const guards = await guardsService.getGuards();
          const active = guards.filter(g => g.enabled);
          
          if (active.length === 0) {
            return formatOutput('payment-agent-01', 'guards', 'No active guard policies.');
          }
          
          let output = 'Active Guard Policies:\n\n';
          active.forEach(guard => {
            output += `${guard.name} (${guard.type})\n`;
            if (guard.config.limit) {
              output += `  Limit: ${guard.config.limit} ${guard.config.period || ''}\n`;
            }
            output += '\n';
          });
          return formatOutput('payment-agent-01', 'guards', output.trim());
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'guards',
            `Error: ${error instanceof Error ? error.message : 'Failed to fetch guards'}`
          );
        }

      case 'check': {
        if (args.length === 0) {
          return formatOutput('payment-agent-01', 'check', 'Error: Please specify amount.\nUsage: check <amount>');
        }
        const checkAmount = parseFloat(args[0]);
        if (isNaN(checkAmount) || checkAmount <= 0) {
          return formatOutput('payment-agent-01', 'check', 'Error: Invalid amount. Must be a positive number.');
        }
        
        try {
          const result = await guardsService.simulatePolicy(checkAmount, '0x0000000000000000000000000000000000000000');
          return formatOutput(
            'payment-agent-01',
            'check',
            `Guard Evaluation (What-If)
Amount: ${checkAmount} USDC

Result: ${result.passed ? 'ALLOWED' : 'BLOCKED'}

Guard Results:
${result.results.map(r => `  ${r.guard}: ${r.passed ? 'PASS' : 'FAIL'}${r.reason ? ` (${r.reason})` : ''}`).join('\n')}`
          );
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'check',
            `Error: ${error instanceof Error ? error.message : 'Failed to evaluate guards'}`
          );
        }
      }

      case 'networks':
        try {
          // Only ARC Testnet is supported via Privy wallets
          return formatOutput(
            'payment-agent-01',
            'networks',
            'Supported Networks:\n\n  • ARC Testnet\n\nAll payments use Privy wallets on ARC Testnet.'
          );
        } catch (error) {
          return formatOutput(
            'payment-agent-01',
            'networks',
            `Error: ${error instanceof Error ? error.message : 'Failed to fetch networks'}`
          );
        }

      case 'clear':
        setLogs([]);
        return '';

      case '':
        return '';

      default:
        return formatOutput(
          'payment-agent-01',
          'unknown',
          `Error: Unknown command "${cmd}".\nType "help" for available commands.`
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const command = input.trim();
    setInput('');
    setIsProcessing(true);

    // Add command to logs
    addLog('command', `$ ${command}`);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const output = await executeCommand(command);
      if (output) {
        addLog('output', output);
      }
    } catch (error) {
      addLog('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[hsl(var(--card))] border border-border/50 rounded-xl overflow-hidden',
        'font-mono text-sm',
        className
      )}
      style={{ height: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Terminal Header - Stripe-style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background shrink-0">
        <span className="text-xs font-medium text-foreground">Execution Console</span>
        <span className="text-xs text-muted-foreground">v1.0.0</span>
      </div>

      {/* Logs Area - Stripe logs style */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-0 bg-[hsl(var(--background))] min-h-0 relative terminal-scroll"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--border)) hsl(var(--muted))',
          WebkitOverflowScrolling: 'touch',
          flex: '1 1 auto',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {logs.map((log, idx) => (
          <div key={log.id} className={cn(
            'flex gap-3 py-1.5 border-b border-border/30 last:border-0',
            idx === 0 && 'border-t-0'
          )}>
            <span className="text-muted-foreground/50 shrink-0 text-xs font-mono tabular-nums">
              [{formatTimestamp(log.timestamp)}]
            </span>
            <div className="flex-1 min-w-0">
              {log.type === 'command' && (
                <span className="text-foreground font-medium font-mono text-xs">{log.content}</span>
              )}
              {log.type === 'output' && (
                <div className="text-foreground/80 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                  {log.content.split('\n').map((line, lineIdx, arr) => {
                    // Format tool call headers (with checkmark)
                    if (line.includes('✓') && line.includes('[') && line.includes(']')) {
                      return (
                        <span key={lineIdx} className="text-[hsl(var(--success))] font-semibold">
                          {line}
                          {lineIdx < arr.length - 1 && '\n'}
                        </span>
                      );
                    }
                    // Format execution steps like Stripe logs
                    if (line.includes('EXECUTION') || line.includes('TOOL_CALL')) {
                      const parts = line.split('→');
                      if (parts.length === 2) {
                        return (
                          <span key={lineIdx}>
                            <span className="font-semibold text-foreground">{parts[0].trim()}</span>
                            <span className="text-muted-foreground"> → </span>
                            <span className="text-foreground">{parts[1].trim()}</span>
                            {lineIdx < arr.length - 1 && '\n'}
                          </span>
                        );
                      }
                    }
                    return (
                      <span key={lineIdx}>
                        {line.startsWith('Agent:') ? (
                          <span className="text-[hsl(var(--success))]">{line}</span>
                        ) : (
                          line
                        )}
                        {lineIdx < arr.length - 1 && '\n'}
                      </span>
                    );
                  })}
                </div>
              )}
              {log.type === 'error' && (
                <span className="text-[hsl(var(--destructive))] font-mono text-xs">{log.content}</span>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-3 py-1.5 border-b border-border/30">
            <span className="text-muted-foreground/50 shrink-0 text-xs font-mono tabular-nums">
              [{formatTimestamp(new Date())}]
            </span>
            <span className="text-muted-foreground font-mono text-xs">Processing...</span>
          </div>
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Input Area - Stripe-style */}
      <form onSubmit={handleSubmit} className="border-t border-border/50 bg-background shrink-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="text-muted-foreground/60 shrink-0 font-mono text-xs">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder={isProcessing ? 'Processing...' : 'Enter an agent instruction or tool command'}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-xs"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </form>
    </div>
  );
}
