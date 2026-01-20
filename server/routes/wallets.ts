import { Router } from 'express';
import { randomUUID } from 'crypto';
import { storage } from '../lib/storage.js';
import { callMcpTool } from '../lib/mcp-client.js';
import { getArcBalance, getUnifiedArcBalance } from '../lib/arc-balance.js';
import type { Wallet } from '../types/index.js';

export const walletsRouter = Router();

// Get all wallets
walletsRouter.get('/', async (req, res) => {
  try {
    // Get wallet addresses from query parameter (from Privy)
    // Express handles array query params as either array or single value
    let walletAddresses: string[] = [];
    if (req.query.addresses) {
      if (Array.isArray(req.query.addresses)) {
        walletAddresses = req.query.addresses as string[];
      } else {
        walletAddresses = [req.query.addresses as string];
      }
    }

    if (walletAddresses.length > 0) {
      // Fetch wallets from ARC network
      const wallets: Wallet[] = await Promise.all(
        walletAddresses.map(async (address) => {
          // Validate address format
          if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
            return null;
          }

          const balance = await getArcBalance(address);
          const usdcToken = balance?.tokens.find(t => t.currency === 'USDC');
          return {
            id: address,
            name: 'Privy Wallet',
            address: address,
            chain: 'arc-testnet' as Wallet['chain'],
            balance: {
              usdc: parseFloat(usdcToken?.amount || balance?.native.amount || '0'),
              native: parseFloat(balance?.native.amount || '0'),
            },
            status: 'active' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        })
      );

      // Filter out null values (invalid addresses)
      const validWallets = wallets.filter((w): w is Wallet => w !== null);
      return res.json(validWallets);
    }
  } catch (error) {
    console.error('Error in wallet fetch:', error);
  }

  // Fallback to storage
  const wallets = storage.getAllWallets();
  res.json(wallets);
});

// ==================== STATIC ROUTES (must come before /:id) ====================
// IMPORTANT: Static routes like /balance/unified and /agent/** must be defined
// BEFORE dynamic routes like /:id, otherwise Express will match them incorrectly.

// Get unified balance across all chains (ARC Network)
walletsRouter.get('/balance/unified', async (req, res) => {
  try {
    // Get wallet addresses from query parameter (from Privy)
    let walletAddresses: string[] = [];
    if (req.query.addresses) {
      if (Array.isArray(req.query.addresses)) {
        walletAddresses = req.query.addresses as string[];
      } else {
        walletAddresses = [req.query.addresses as string];
      }
    }

    // Filter valid addresses
    walletAddresses = walletAddresses.filter(addr => addr && addr.match(/^0x[a-fA-F0-9]{40}$/));

    if (walletAddresses.length > 0) {
      const result = await getUnifiedArcBalance(walletAddresses);
      return res.json(result);
    }

    // No wallet addresses provided - return empty balance instead of calling non-existent MCP tool
    return res.json({
      total: 0,
      by_chain: {},
    });
  } catch (error) {
    console.error('Failed to get unified balance:', error);

    // PHASE 1: Return structured error instead of silent fallback to 0
    const debugId = randomUUID();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[${debugId}] Balance unavailable:`, errorMessage);

    return res.status(502).json({
      errorCode: 'BALANCE_UNAVAILABLE',
      message: 'Unable to fetch balance from Circle API or MCP server',
      details: errorMessage,
      debugId,
    });
  }
});

// Get agent wallet balance (must be before /:id/balance)
walletsRouter.get('/agent/balance', async (req, res) => {
  try {
    const privyUserId = req.headers['x-privy-user-id'] as string;

    if (!privyUserId) {
      return res.status(401).json({ error: 'User ID required. Please include X-Privy-User-Id header.' });
    }

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    // Support both VITE_SUPABASE_URL (frontend) and SUPABASE_URL (backend)
    let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.' });
    }

    // Ensure URL has https:// protocol
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = `https://${supabaseUrl}`;
    }

    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError);
      return res.status(500).json({
        error: 'Failed to initialize database connection',
        details: clientError instanceof Error ? clientError.message : 'Invalid Supabase configuration'
      });
    }

    // Get user by Privy ID, or create if doesn't exist
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .maybeSingle();

    // Handle user lookup errors
    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine - we'll create the user
      // Any other error is a real problem
      console.error('Error fetching user from Supabase:', userError);
      return res.status(500).json({
        error: 'Failed to fetch user from database',
        details: userError.message || 'Database query failed'
      });
    }

    // If user doesn't exist, create it
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          privy_user_id: privyUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating user in Supabase:', createError);
        // Check if it's a duplicate key error (user was created between check and insert)
        if (createError.code === '23505') {
          // Try to fetch the user again
          const { data: retryUser } = await supabase
            .from('users')
            .select('id')
            .eq('privy_user_id', privyUserId)
            .maybeSingle();

          if (retryUser) {
            user = retryUser;
          } else {
            return res.status(500).json({
              error: 'Failed to create user in database',
              details: 'User creation conflict. Please try again.'
            });
          }
        } else {
          return res.status(500).json({
            error: 'Failed to create user in database',
            details: createError.message || 'Unknown database error'
          });
        }
      } else if (!newUser) {
        return res.status(500).json({
          error: 'Failed to create user in database',
          details: 'User creation returned no data'
        });
      } else {
        user = newUser;
      }
    }

    // Get agent wallet - get ALL active wallets and use the most recent one
    // Try with status filter first, fallback to without status if column doesn't exist
    let { data: agentWallets, error: walletError } = await supabase
      .from('agent_wallets')
      .select('circle_wallet_id, circle_wallet_address, id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }); // Get most recent first

    // If error suggests status column doesn't exist, try without status filter
    if (walletError && walletError.code !== 'PGRST116' && walletError.message?.includes('status')) {
      console.warn('Status column may not exist, trying query without status filter:', walletError.message);
      const fallbackResult = await supabase
        .from('agent_wallets')
        .select('circle_wallet_id, circle_wallet_address, id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!fallbackResult.error) {
        agentWallets = fallbackResult.data || [];
        walletError = null;
        // Filter to only active wallets if status column exists
        if (agentWallets.length > 0 && agentWallets[0].status !== undefined) {
          agentWallets = agentWallets.filter(w => w.status === 'active');
        }
      } else {
        walletError = fallbackResult.error;
      }
    }

    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching agent wallet:', walletError);
      return res.status(500).json({
        error: 'Failed to fetch agent wallet',
        details: walletError.message || 'Database query failed'
      });
    }

    // Check for duplicate active wallets and keep the one with 1 USDC, deactivate others
    if (agentWallets && agentWallets.length > 1) {
      console.warn(`[GET /api/wallets/agent/balance] Found ${agentWallets.length} active wallets for user ${user.id}. Checking balances to keep the correct one.`);
      
      // Fetch balances for all wallets to determine which one to keep
      const { callMcp } = await import('../lib/mcp-client.js');
      const walletsWithBalances = await Promise.all(
        agentWallets.map(async (wallet) => {
          try {
            const balanceResult = await callMcp('check_balance', { wallet_id: wallet.circle_wallet_id }) as any;
            const balance = balanceResult?.status === 'success' ? parseFloat(balanceResult.usdc_balance || '0') : 0;
            return { ...wallet, balance };
          } catch (error) {
            console.error(`Failed to fetch balance for wallet ${wallet.circle_wallet_id}:`, error);
            return { ...wallet, balance: 0 };
          }
        })
      );
      
      // Find wallet with 1 USDC (or closest to 1), otherwise use most recent
      const walletWith1USDC = walletsWithBalances.find(w => Math.abs(w.balance - 1.0) < 0.01); // Allow small tolerance
      const walletToKeep = walletWith1USDC || walletsWithBalances[0]; // Use 1 USDC wallet or most recent
      
      // Deactivate all other wallets
      const walletsToDeactivate = walletsWithBalances.filter(w => w.id !== walletToKeep.id);
      if (walletsToDeactivate.length > 0) {
        const duplicateIds = walletsToDeactivate.map(w => w.id);
        await supabase
          .from('agent_wallets')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .in('id', duplicateIds);
        
        console.log(`[GET /api/wallets/agent/balance] Deactivated ${duplicateIds.length} duplicate wallets. Kept wallet ${walletToKeep.circle_wallet_id} with balance ${walletToKeep.balance} USDC`);
      }
      
      // Update agentWallets to only include the kept wallet
      agentWallets = [walletToKeep];
    }

    const agentWallet = agentWallets && agentWallets.length > 0 ? agentWallets[0] : null;

    if (!agentWallet) {
      return res.status(404).json({ error: 'Agent wallet not found' });
    }

    console.log(`[GET /api/wallets/agent/balance] Found agent wallet for user ${user.id}:`, {
      circle_wallet_id: agentWallet.circle_wallet_id,
      circle_wallet_address: agentWallet.circle_wallet_address,
    });

    // Get balance from Circle API via MCP
    let balance = 0;
    let balanceError: string | null = null;
    try {
      const { callMcp } = await import('../lib/mcp-client.js');
      console.log(`[GET /api/wallets/agent/balance] Fetching balance for wallet_id: ${agentWallet.circle_wallet_id}`);
      
      const balanceResult = await callMcp('check_balance', { wallet_id: agentWallet.circle_wallet_id }) as any;
      console.log(`[GET /api/wallets/agent/balance] MCP response:`, JSON.stringify(balanceResult, null, 2));

      if (balanceResult?.status === 'success') {
        const usdcBalanceStr = balanceResult.usdc_balance || '0';
        balance = parseFloat(usdcBalanceStr);
        console.log(`[GET /api/wallets/agent/balance] Successfully fetched balance: ${balance} USDC`);
      } else {
        // If status is not success, capture error message
        balanceError = balanceResult?.message || balanceResult?.error || 'Balance check returned non-success status';
        console.warn(`[GET /api/wallets/agent/balance] Balance check returned non-success status:`, balanceError, 'Full response:', balanceResult);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      balanceError = `Failed to fetch balance: ${errorMessage}`;
      console.error(`[GET /api/wallets/agent/balance] Failed to fetch balance for wallet ${agentWallet.circle_wallet_id}:`, errorMessage, error);
    }

    return res.json({
      balance: balance,
      currency: 'USDC',
      walletId: agentWallet.circle_wallet_id,
      ...(balanceError && { error: balanceError, warning: 'Balance may be inaccurate due to fetch error' }),
    });
  } catch (error) {
    console.error('Error in GET /api/wallets/agent/balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DYNAMIC ROUTES ====================

// Get a specific wallet
walletsRouter.get('/:id', async (req, res) => {
  const walletId = req.params.id;

  // Check if it's a Privy wallet address (0x...)
  if (walletId.match(/^0x[a-fA-F0-9]{40}$/)) {
    try {
      const balance = await getArcBalance(walletId);
      const usdcToken = balance?.tokens.find(t => t.currency === 'USDC');
      const wallet: Wallet = {
        id: walletId,
        name: 'Privy Wallet',
        address: walletId,
        chain: 'arc-testnet' as Wallet['chain'],
        balance: {
          usdc: parseFloat(usdcToken?.amount || balance?.native.amount || '0'),
          native: parseFloat(balance?.native.amount || '0'),
        },
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return res.json(wallet);
    } catch (error) {
      console.error('Failed to fetch wallet from ARC network:', error);
    }
  }

  // Fallback to storage
  const wallet = storage.getWallet(walletId);
  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  // Try to refresh balance from ARC network if it's a Privy address
  if (wallet.address && wallet.address.match(/^0x[a-fA-F0-9]{40}$/)) {
    try {
      const balance = await getArcBalance(wallet.address);
      if (balance) {
        const usdcToken = balance.tokens.find(t => t.currency === 'USDC');
        wallet.balance = {
          usdc: parseFloat(usdcToken?.amount || balance.native.amount || '0'),
          native: parseFloat(balance.native.amount || '0'),
        };
        wallet.updatedAt = new Date().toISOString();
        storage.saveWallet(wallet);
      }
    } catch (error) {
      console.error('Failed to refresh wallet balance from ARC network:', error);
    }
  }

  res.json(wallet);
});

// Create a new wallet
walletsRouter.post('/', async (req, res) => {
  const { name, chain, address } = req.body;

  if (!name || !chain) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate address format if provided
  if (address && !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ error: 'Invalid wallet address format' });
  }

  // Use provided address or generate a new one
  let walletAddress: string;
  if (address) {
    walletAddress = address;
  } else {
    // Generate a placeholder address (in production, this would call SDK to create wallet)
    walletAddress = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
  }

  const wallet: Wallet = {
    id: `wallet_${Date.now()}`,
    name,
    address: walletAddress,
    chain: chain as Wallet['chain'],
    balance: { usdc: 0, native: 0 },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  storage.saveWallet(wallet);
  res.status(201).json(wallet);
});

// Get wallet balance from ARC Network
walletsRouter.get('/:id/balance', async (req, res) => {
  const walletAddress = req.params.id;

  // Validate address format
  if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ error: 'Invalid wallet address format' });
  }

  try {
    const balance = await getArcBalance(walletAddress);
    if (balance) {
      return res.json({
        walletId: walletAddress,
        chain: 'arc-testnet',
        native: balance.native,
        tokens: balance.tokens,
      });
    }
  } catch (error) {
    console.error('Failed to get balance from ARC network:', error);
  }

  // Fallback: return zero balance
  res.json({
    walletId: walletAddress,
    chain: 'arc-testnet',
    native: { amount: '0', currency: 'USDC' },
    tokens: [{ tokenAddress: 'native', amount: '0', currency: 'USDC' }],
  });
});

// Get supported networks (ARC Testnet only)
walletsRouter.get('/:id/networks', async (req, res) => {
  // Only ARC Testnet is supported via Privy wallets
  res.json({ networks: ['arc-testnet'] });
});

// ==================== AGENT WALLET ENDPOINTS ====================

// Get agent wallet for current user
walletsRouter.get('/agent', async (req, res) => {
  try {
    const privyUserId = req.headers['x-privy-user-id'] as string;

    if (!privyUserId) {
      return res.status(401).json({ error: 'User ID required. Please include X-Privy-User-Id header.' });
    }

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    // Support both VITE_SUPABASE_URL (frontend) and SUPABASE_URL (backend)
    let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.' });
    }

    // Ensure URL has https:// protocol
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = `https://${supabaseUrl}`;
    }

    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError);
      return res.status(500).json({
        error: 'Failed to initialize database connection',
        details: clientError instanceof Error ? clientError.message : 'Invalid Supabase configuration'
      });
    }

    // Get user by Privy ID, or create if doesn't exist
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .maybeSingle();

    // Handle user lookup errors
    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine - we'll create the user
      // Any other error is a real problem
      console.error('Error fetching user from Supabase:', userError);
      return res.status(500).json({
        error: 'Failed to fetch user from database',
        details: userError.message || 'Database query failed'
      });
    }

    // If user doesn't exist, create it
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          privy_user_id: privyUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating user in Supabase:', createError);
        // Check if it's a duplicate key error (user was created between check and insert)
        if (createError.code === '23505') {
          // Try to fetch the user again
          const { data: retryUser } = await supabase
            .from('users')
            .select('id')
            .eq('privy_user_id', privyUserId)
            .maybeSingle();

          if (retryUser) {
            user = retryUser;
          } else {
            return res.status(500).json({
              error: 'Failed to create user in database',
              details: 'User creation conflict. Please try again.'
            });
          }
        } else {
          return res.status(500).json({
            error: 'Failed to create user in database',
            details: createError.message || 'Unknown database error'
          });
        }
      } else if (!newUser) {
        return res.status(500).json({
          error: 'Failed to create user in database',
          details: 'User creation returned no data'
        });
      } else {
        user = newUser;
      }
    }

    // Get agent wallet for this user - get ALL active wallets and use the most recent one
    // Try with status filter first, fallback to without status if column doesn't exist
    let { data: agentWallets, error: walletError } = await supabase
      .from('agent_wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }); // Get most recent first

    // If error suggests status column doesn't exist, try without status filter
    if (walletError && walletError.code !== 'PGRST116' && walletError.message?.includes('status')) {
      console.warn('Status column may not exist, trying query without status filter:', walletError.message);
      const fallbackResult = await supabase
        .from('agent_wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!fallbackResult.error) {
        agentWallets = fallbackResult.data || [];
        walletError = null;
        // Filter to only active wallets if status column exists
        if (agentWallets.length > 0 && agentWallets[0].status !== undefined) {
          agentWallets = agentWallets.filter(w => w.status === 'active');
        }
      } else {
        walletError = fallbackResult.error;
      }
    }

    // Handle errors (PGRST116 means no rows found, which is fine)
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching agent wallet:', walletError);
      return res.status(500).json({
        error: 'Failed to fetch agent wallet',
        details: walletError.message || 'Database query failed'
      });
    }

    // Check for duplicate active wallets and keep the one with 1 USDC, deactivate others
    if (agentWallets && agentWallets.length > 1) {
      console.warn(`[GET /api/wallets/agent] Found ${agentWallets.length} active wallets for user ${user.id}. Checking balances to keep the correct one.`);
      
      // Fetch balances for all wallets to determine which one to keep
      const { callMcp } = await import('../lib/mcp-client.js');
      const walletsWithBalances = await Promise.all(
        agentWallets.map(async (wallet) => {
          try {
            const balanceResult = await callMcp('check_balance', { wallet_id: wallet.circle_wallet_id }) as any;
            const balance = balanceResult?.status === 'success' ? parseFloat(balanceResult.usdc_balance || '0') : 0;
            return { ...wallet, balance };
          } catch (error) {
            console.error(`Failed to fetch balance for wallet ${wallet.circle_wallet_id}:`, error);
            return { ...wallet, balance: 0 };
          }
        })
      );
      
      // Find wallet with 1 USDC (or closest to 1), otherwise use most recent
      const walletWith1USDC = walletsWithBalances.find(w => Math.abs(w.balance - 1.0) < 0.01); // Allow small tolerance
      const walletToKeep = walletWith1USDC || walletsWithBalances[0]; // Use 1 USDC wallet or most recent
      
      // Deactivate all other wallets
      const walletsToDeactivate = walletsWithBalances.filter(w => w.id !== walletToKeep.id);
      if (walletsToDeactivate.length > 0) {
        const duplicateIds = walletsToDeactivate.map(w => w.id);
        await supabase
          .from('agent_wallets')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .in('id', duplicateIds);
        
        console.log(`[GET /api/wallets/agent] Deactivated ${duplicateIds.length} duplicate wallets. Kept wallet ${walletToKeep.circle_wallet_id} with balance ${walletToKeep.balance} USDC`);
      }
      
      // Update agentWallets to only include the kept wallet
      agentWallets = [walletToKeep];
    }

    const agentWallet = agentWallets && agentWallets.length > 0 ? agentWallets[0] : null;

    if (!agentWallet) {
      // Wallet doesn't exist - return 404 so frontend can create it
      return res.status(404).json({
        error: 'Agent wallet not found',
        autoCreate: true
      });
    }

    // Get balance from Circle API via MCP
    let balance = 0;
    let balanceError: string | null = null;
    try {
      const { callMcp } = await import('../lib/mcp-client.js');
      const balanceResult = await callMcp('check_balance', { wallet_id: agentWallet.circle_wallet_id }) as any;

      if (balanceResult?.status === 'success') {
        balance = parseFloat(balanceResult.usdc_balance || '0');
      } else {
        // If status is not success, capture error message
        balanceError = balanceResult?.message || 'Balance check returned non-success status';
        console.warn(`[GET /api/wallets/agent] Balance check returned non-success status:`, balanceError);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      balanceError = `Failed to fetch balance: ${errorMessage}`;
      console.error(`[GET /api/wallets/agent] Failed to fetch balance for wallet ${agentWallet.circle_wallet_id}:`, errorMessage);
    }

    return res.json({
      walletId: agentWallet.circle_wallet_id,
      address: agentWallet.circle_wallet_address,
      balance: balance,
      status: agentWallet.status,
      network: 'arc-testnet',
      createdAt: agentWallet.created_at,
      ...(balanceError && { balanceError, warning: 'Balance may be inaccurate due to fetch error' }),
    });
  } catch (error) {
    console.error('Error in GET /api/wallets/agent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create agent wallet for current user
walletsRouter.post('/agent/create', async (req, res) => {
  try {
    const privyUserId = req.headers['x-privy-user-id'] as string;

    if (!privyUserId) {
      return res.status(401).json({ error: 'User ID required. Please include X-Privy-User-Id header.' });
    }

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    // Support both VITE_SUPABASE_URL (frontend) and SUPABASE_URL (backend)
    let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.' });
    }

    // Ensure URL has https:// protocol
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = `https://${supabaseUrl}`;
    }

    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError);
      return res.status(500).json({
        error: 'Failed to initialize database connection',
        details: clientError instanceof Error ? clientError.message : 'Invalid Supabase configuration'
      });
    }

    // Get user by Privy ID, or create if doesn't exist
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .maybeSingle();

    // Handle user lookup errors
    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine - we'll create the user
      // Any other error is a real problem
      console.error('Error fetching user from Supabase:', userError);
      return res.status(500).json({
        error: 'Failed to fetch user from database',
        details: userError.message || 'Database query failed'
      });
    }

    // If user doesn't exist, create it
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          privy_user_id: privyUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating user in Supabase:', createError);
        // Check if it's a duplicate key error (user was created between check and insert)
        if (createError.code === '23505') {
          // Try to fetch the user again
          const { data: retryUser } = await supabase
            .from('users')
            .select('id')
            .eq('privy_user_id', privyUserId)
            .maybeSingle();

          if (retryUser) {
            user = retryUser;
          } else {
            return res.status(500).json({
              error: 'Failed to create user in database',
              details: 'User creation conflict. Please try again.'
            });
          }
        } else {
          return res.status(500).json({
            error: 'Failed to create user in database',
            details: createError.message || 'Unknown database error'
          });
        }
      } else if (!newUser) {
        return res.status(500).json({
          error: 'Failed to create user in database',
          details: 'User creation returned no data'
        });
      } else {
        user = newUser;
      }
    }

    // Check if agent wallet already exists - get ALL wallets to check for duplicates
    // Try with status filter first, fallback to without status if column doesn't exist
    let { data: existingWallets, error: walletError } = await supabase
      .from('agent_wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }); // Get most recent first

    // If error suggests status column doesn't exist, try without status filter
    if (walletError && walletError.code !== 'PGRST116' && walletError.message?.includes('status')) {
      console.warn('Status column may not exist, trying query without status filter:', walletError.message);
      const fallbackResult = await supabase
        .from('agent_wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!fallbackResult.error) {
        existingWallets = fallbackResult.data || [];
        walletError = null;
        // Filter to only active wallets if status column exists
        if (existingWallets.length > 0 && existingWallets[0].status !== undefined) {
          existingWallets = existingWallets.filter(w => w.status === 'active');
        }
      } else {
        walletError = fallbackResult.error;
      }
    }

    // Ignore PGRST116 (no rows found) - that's expected if wallet doesn't exist
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error checking for existing wallet:', walletError);
      return res.status(500).json({
        error: 'Failed to check for existing wallet',
        details: walletError.message || 'Database query failed'
      });
    }

    // Check for duplicate active wallets and keep the one with 1 USDC
    if (existingWallets && existingWallets.length > 0) {
      // If multiple active wallets exist, check balances and keep the one with 1 USDC
      if (existingWallets.length > 1) {
        console.warn(`[POST /api/wallets/agent/create] Found ${existingWallets.length} active wallets for user ${user.id}. Checking balances to keep the correct one.`);
        
        // Fetch balances for all wallets to determine which one to keep
        const { callMcp } = await import('../lib/mcp-client.js');
        const walletsWithBalances = await Promise.all(
          existingWallets.map(async (wallet) => {
            try {
              const balanceResult = await callMcp('check_balance', { wallet_id: wallet.circle_wallet_id }) as any;
              const balance = balanceResult?.status === 'success' ? parseFloat(balanceResult.usdc_balance || '0') : 0;
              return { ...wallet, balance };
            } catch (error) {
              console.error(`Failed to fetch balance for wallet ${wallet.circle_wallet_id}:`, error);
              return { ...wallet, balance: 0 };
            }
          })
        );
        
        // Find wallet with 1 USDC (or closest to 1), otherwise use most recent
        const walletWith1USDC = walletsWithBalances.find(w => Math.abs(w.balance - 1.0) < 0.01); // Allow small tolerance
        const walletToKeep = walletWith1USDC || walletsWithBalances[0]; // Use 1 USDC wallet or most recent
        
        // Deactivate all other wallets
        const walletsToDeactivate = walletsWithBalances.filter(w => w.id !== walletToKeep.id);
        if (walletsToDeactivate.length > 0) {
          const duplicateIds = walletsToDeactivate.map(w => w.id);
          await supabase
            .from('agent_wallets')
            .update({
              status: 'inactive',
              updated_at: new Date().toISOString(),
            })
            .in('id', duplicateIds);
          
          console.log(`[POST /api/wallets/agent/create] Deactivated ${duplicateIds.length} duplicate wallets. Kept wallet ${walletToKeep.circle_wallet_id} with balance ${walletToKeep.balance} USDC`);
        }
        
        // Update existingWallets to only include the kept wallet
        existingWallets = [walletToKeep];
      }
      
      const existingWallet = existingWallets[0]; // Use wallet with 1 USDC or most recent
      
      // Return existing wallet
      // Return existing wallet
      let balance = '0';
      try {
        const { callMcp } = await import('../lib/mcp-client.js');
        const balanceResult = await callMcp('check_balance', { wallet_id: existingWallet.circle_wallet_id }) as any;
        if (balanceResult?.status === 'success') {
          balance = balanceResult.usdc_balance || '0';
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }

      return res.json({
        walletId: existingWallet.circle_wallet_id,
        address: existingWallet.circle_wallet_address,
        balance: parseFloat(balance),
        status: existingWallet.status,
        network: 'arc-testnet',
        createdAt: existingWallet.created_at,
      });
    }

    // Create new Circle wallet via MCP
    let walletResult;
    try {
      const { callMcp } = await import('../lib/mcp-client.js');
      walletResult = await callMcp('create_agent_wallet', {
        agent_name: `user-${privyUserId.slice(0, 8)}`
      }) as any;
    } catch (mcpError) {
      console.error('MCP call failed:', mcpError);
      return res.status(500).json({
        error: 'Failed to create Circle wallet',
        details: mcpError instanceof Error ? mcpError.message : 'MCP server connection failed. Make sure MCP server is running on port 3333.'
      });
    }

    if (!walletResult || walletResult.status !== 'success' || !walletResult.wallet) {
      const errorMessage = walletResult?.message || walletResult?.error || 'Unknown error from MCP server';
      console.error('MCP wallet creation failed:', walletResult);
      return res.status(500).json({
        error: 'Failed to create Circle wallet',
        details: errorMessage
      });
    }

    const circleWallet = walletResult.wallet;
    const circleWalletId = circleWallet.wallet_id || circleWallet.id;
    const circleWalletAddress = circleWallet.address;

    // Save to Supabase
    const { data: agentWallet, error: insertError } = await supabase
      .from('agent_wallets')
      .insert({
        user_id: user.id,
        privy_user_id: privyUserId,
        circle_wallet_id: circleWalletId,
        circle_wallet_address: circleWalletAddress,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving agent wallet:', insertError);
      return res.status(500).json({ error: 'Failed to save agent wallet' });
    }

    res.status(201).json({
      walletId: circleWalletId,
      address: circleWalletAddress,
      balance: 0,
      status: 'active',
      network: 'arc-testnet',
      createdAt: agentWallet.created_at,
    });
  } catch (error) {
    console.error('Error in POST /api/wallets/agent/create:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset agent wallet (disable old, create new)
walletsRouter.post('/agent/reset', async (req, res) => {
  try {
    const privyUserId = req.headers['x-privy-user-id'] as string;

    if (!privyUserId) {
      return res.status(401).json({ error: 'User ID required. Please include X-Privy-User-Id header.' });
    }

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    // Support both VITE_SUPABASE_URL (frontend) and SUPABASE_URL (backend)
    let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.' });
    }

    // Ensure URL has https:// protocol
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = `https://${supabaseUrl}`;
    }

    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError);
      return res.status(500).json({
        error: 'Failed to initialize database connection',
        details: clientError instanceof Error ? clientError.message : 'Invalid Supabase configuration'
      });
    }

    // Get user by Privy ID, or create if doesn't exist
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .maybeSingle();

    // Handle user lookup errors
    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine - we'll create the user
      // Any other error is a real problem
      console.error('Error fetching user from Supabase:', userError);
      return res.status(500).json({
        error: 'Failed to fetch user from database',
        details: userError.message || 'Database query failed'
      });
    }

    // If user doesn't exist, create it
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          privy_user_id: privyUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating user in Supabase:', createError);
        // Check if it's a duplicate key error (user was created between check and insert)
        if (createError.code === '23505') {
          // Try to fetch the user again
          const { data: retryUser } = await supabase
            .from('users')
            .select('id')
            .eq('privy_user_id', privyUserId)
            .maybeSingle();

          if (retryUser) {
            user = retryUser;
          } else {
            return res.status(500).json({
              error: 'Failed to create user in database',
              details: 'User creation conflict. Please try again.'
            });
          }
        } else {
          return res.status(500).json({
            error: 'Failed to create user in database',
            details: createError.message || 'Unknown database error'
          });
        }
      } else if (!newUser) {
        return res.status(500).json({
          error: 'Failed to create user in database',
          details: 'User creation returned no data'
        });
      } else {
        user = newUser;
      }
    }

    // Disable ALL existing wallets (including inactive ones to be safe)
    // This ensures we only have one active wallet per user
    const { data: allWallets } = await supabase
      .from('agent_wallets')
      .select('id')
      .eq('user_id', user.id);
    
    if (allWallets && allWallets.length > 0) {
      const walletIds = allWallets.map(w => w.id);
      await supabase
        .from('agent_wallets')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .in('id', walletIds);
      
      console.log(`[POST /api/wallets/agent/reset] Deactivated ${walletIds.length} existing wallets for user ${user.id}`);
    }

    // Create new Circle wallet via MCP
    let walletResult;
    try {
      const { callMcp } = await import('../lib/mcp-client.js');
      walletResult = await callMcp('create_agent_wallet', {
        agent_name: `user-${privyUserId.slice(0, 8)}`
      }) as any;
    } catch (mcpError) {
      console.error('MCP call failed:', mcpError);
      return res.status(500).json({
        error: 'Failed to create Circle wallet',
        details: mcpError instanceof Error ? mcpError.message : 'MCP server connection failed. Make sure MCP server is running on port 3333.'
      });
    }

    if (!walletResult || walletResult.status !== 'success' || !walletResult.wallet) {
      const errorMessage = walletResult?.message || walletResult?.error || 'Unknown error from MCP server';
      console.error('MCP wallet creation failed:', walletResult);
      return res.status(500).json({
        error: 'Failed to create Circle wallet',
        details: errorMessage
      });
    }

    const circleWallet = walletResult.wallet;
    const circleWalletId = circleWallet.wallet_id || circleWallet.id;
    const circleWalletAddress = circleWallet.address;

    // Save new wallet to Supabase
    const { data: agentWallet, error: insertError } = await supabase
      .from('agent_wallets')
      .insert({
        user_id: user.id,
        privy_user_id: privyUserId,
        circle_wallet_id: circleWalletId,
        circle_wallet_address: circleWalletAddress,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving agent wallet:', insertError);
      return res.status(500).json({ error: 'Failed to save agent wallet' });
    }

    res.json({
      walletId: circleWalletId,
      address: circleWalletAddress,
      balance: 0,
      status: 'active',
      network: 'arc-testnet',
      createdAt: agentWallet.created_at,
    });
  } catch (error) {
    console.error('Error in POST /api/wallets/agent/reset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
