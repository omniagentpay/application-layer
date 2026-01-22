import { useState, memo, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LiveIndicator } from '@/components/LiveIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Moon, Sun, Menu, LogOut, User, AtSign, Wallet, Bell, Shield } from 'lucide-react';
import { ensureUserInSupabase } from '@/lib/supabase';
import { getUserByPrivyId } from '@/services/supabase/users';
import { agentWalletService } from '@/services/wallets';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

export const AppNavbar = memo(function AppNavbar() {
  const { sidebarCollapsed, theme, toggleTheme, setMobileSidebarOpen } = useApp();
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [agentBalance, setAgentBalance] = useState<number | null>(null); // null = loading, number = loaded (can be 0)
  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  const loadUsername = async () => {
    try {
      const privyUserId = user?.id;
      if (!privyUserId) return;

      const email = user?.email?.address || user?.google?.email || undefined;
      const walletAddress = user?.wallet?.address || wallets?.[0]?.address || undefined;

      await ensureUserInSupabase(privyUserId, email, walletAddress);

      const userData = await getUserByPrivyId(privyUserId);
      if (userData?.username) {
        setUsername(userData.username);
      }
    } catch (error) {
      console.error('Error loading username:', error);
    }
  };

  const loadAgentBalance = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('[AppNavbar] Loading agent balance for user:', user.id);
      // Add timestamp to prevent caching
      const balanceData = await agentWalletService.getAgentWalletBalance(user.id);
      console.log('[AppNavbar] Balance data received:', balanceData);
      
      // Ensure balance is a valid number (including 0)
      const balance = typeof balanceData.balance === 'number' && !isNaN(balanceData.balance) 
        ? balanceData.balance 
        : 0; // Default to 0 instead of null so balance always displays
      
      // Always update balance (even if 0) - this ensures the display stays visible
      setAgentBalance(balance);
      console.log('[AppNavbar] Balance updated to:', balance, 'USDC, Wallet ID:', balanceData.walletId);
      
      // Log warnings but don't prevent balance update
      if ((balanceData as any).error || (balanceData as any).warning) {
        const errorMsg = (balanceData as any).error || (balanceData as any).warning;
        console.warn('[AppNavbar] Balance fetch warning:', errorMsg);
        console.warn('[AppNavbar] Wallet ID:', balanceData.walletId);
      }
    } catch (error) {
      // Log error but don't clear balance - might be temporary network issue
      console.error('[AppNavbar] Failed to load agent balance:', error);
      // Only set to 0 if it's a permanent error (like wallet doesn't exist)
      // Keep previous balance visible if it's just a temporary network issue
      if (error instanceof Error && error.message.includes('404')) {
        setAgentBalance(0); // Set to 0 instead of null so display stays visible
      }
      // For other errors, keep the current balance value (don't clear it)
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadUsername();
      loadAgentBalance();
    }
  }, [user, wallets, loadAgentBalance]);

  // Refresh balance periodically and after payment operations
  useEffect(() => {
    if (!user?.id) return;
    
    // Refresh immediately, then set up interval
    loadAgentBalance();
    
    const interval = setInterval(() => {
      loadAgentBalance();
    }, 15000); // Refresh every 15 seconds (more frequent for accuracy)

    return () => clearInterval(interval);
  }, [user?.id, loadAgentBalance]);

  // Listen for balance updates from payment operations
  useEffect(() => {
    const handleBalanceUpdate = () => {
      loadAgentBalance();
    };
    
    // Listen for custom events that indicate balance should be refreshed
    window.addEventListener('payment-completed', handleBalanceUpdate);
    window.addEventListener('payment-executed', handleBalanceUpdate);
    window.addEventListener('balance-updated', handleBalanceUpdate);
    
    return () => {
      window.removeEventListener('payment-completed', handleBalanceUpdate);
      window.removeEventListener('payment-executed', handleBalanceUpdate);
      window.removeEventListener('balance-updated', handleBalanceUpdate);
    };
  }, [loadAgentBalance]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitials = username
    ? username.substring(0, 2).toUpperCase()
    : user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : user?.wallet?.address
    ? user.wallet.address.substring(2, 4).toUpperCase()
    : 'U';

  const displayName = username
    ? `@${username}`
    : user?.email || user?.wallet?.address
    ? user.email || `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
    : 'User';

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or perform search
      // For now, we'll just log it - you can implement actual search logic later
      console.log('Searching for:', searchQuery);
      // Example: navigate(`/app/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }, [searchQuery]);

  return (
    <nav
      className={cn(
        'fixed top-0 right-0 z-30 h-16 border-b border-border/50 bg-background/95 backdrop-blur-sm transition-all duration-200 ease-in-out flex items-center gap-3 sm:gap-4',
        'px-4 sm:px-6',
        isMobile ? 'left-0' : sidebarCollapsed ? 'left-[calc(var(--sidebar-collapsed-width)+2rem)]' : 'left-[calc(var(--sidebar-width)+2rem)]'
      )}
    >
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(true)}
          className="h-9 w-9 shrink-0 touch-manipulation"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Search Bar - Stripe-style */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full bg-background border-border/50 focus-visible:border-border focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </form>

      {/* Agent Balance Display - Stripe-style pill */}
      {!isMobile && user && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--success))]/12 border-0">
          <Wallet className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
          <span className="text-xs font-medium text-[hsl(var(--success))]">
            {agentBalance !== null && agentBalance !== undefined ? agentBalance.toFixed(2) : '...'} USDC
          </span>
        </div>
      )}

      {/* Notification Bell */}
      {!isMobile && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 relative"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end" forceMount>
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-6 text-xs"
                >
                  Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.slice(0, 10).map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 cursor-pointer',
                      !notif.read && 'bg-primary/5'
                    )}
                    onClick={() => {
                      if (notif.explorerUrl) {
                        window.open(notif.explorerUrl, '_blank');
                      }
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm">{notif.title}</span>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {notif.message}
                    </span>
                    {notif.txHash && (
                      <span className="text-xs text-primary hover:underline">
                        View tx: {notif.txHash.slice(0, 10)}...
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Live Indicator */}
      {!isMobile && (
        <LiveIndicator />
      )}

      {/* Theme Toggle - Stripe-style */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="h-9 w-9 shrink-0 touch-manipulation hover:bg-muted/50"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        {theme === 'light' ? (
          <Moon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Sun className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {/* Gasless Transfer Indicator */}
      {!isMobile && user && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--success))]/12 border-0">
          <Shield className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
          <span className="text-xs font-medium text-[hsl(var(--success))]">
            Gasless Transfer Active
          </span>
        </div>
      )}

      {/* Wallet Address Display */}
      {!isMobile && user?.wallet?.address && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50">
          <span className="text-xs font-mono text-muted-foreground">
            {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
          </span>
        </div>
      )}

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                {username && <AtSign className="w-3 h-3 text-muted-foreground" />}
                <p className="text-sm font-medium leading-none">
                  {displayName}
                </p>
              </div>
              {user?.wallet?.address && !username && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/app/settings')}>
            <User className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
});
