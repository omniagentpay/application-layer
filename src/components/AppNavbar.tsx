import { useState, memo, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuditorModeToggle } from '@/components/AuditorModeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Moon, Sun, Menu, LogOut, User, AtSign, Wallet } from 'lucide-react';
import { ensureUserInSupabase } from '@/lib/supabase';
import { getUserByPrivyId } from '@/services/supabase/users';
import { agentWalletService } from '@/services/wallets';

export const AppNavbar = memo(function AppNavbar() {
  const { sidebarCollapsed, theme, toggleTheme, setMobileSidebarOpen, auditorMode, setAuditorMode } = useApp();
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [agentBalance, setAgentBalance] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      loadUsername();
      loadAgentBalance();
    }
  }, [user, wallets]);

  // Refresh balance periodically
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(() => {
      loadAgentBalance();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

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

  const loadAgentBalance = async () => {
    if (!user?.id) return;
    
    try {
      console.log('[AppNavbar] Loading agent balance for user:', user.id);
      const balanceData = await agentWalletService.getAgentWalletBalance(user.id);
      console.log('[AppNavbar] Balance data received:', balanceData);
      
      const balance = balanceData.balance;
      setAgentBalance(balance);
      
      // Log warning if balance fetch had errors
      if ((balanceData as any).error || (balanceData as any).warning) {
        const errorMsg = (balanceData as any).error || (balanceData as any).warning;
        console.warn('[AppNavbar] Balance fetch warning:', errorMsg);
        console.warn('[AppNavbar] Wallet ID:', balanceData.walletId);
      }
    } catch (error) {
      // Log error but don't show to user - wallet might not exist yet
      console.error('[AppNavbar] Failed to load agent balance:', error);
      setAgentBalance(null);
    }
  };

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
        'fixed top-0 right-0 z-30 h-14 border-b bg-background transition-all duration-200 ease-in-out flex items-center gap-2 sm:gap-4',
        'px-2 sm:px-4',
        isMobile ? 'left-0' : sidebarCollapsed ? 'left-sidebar-collapsed' : 'left-sidebar'
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

      {/* Search Bar - Premium */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full bg-background-elevated border-border-subtle focus-visible:bg-background"
          />
        </div>
      </form>

      {/* Agent Balance Display */}
      {!isMobile && agentBalance !== null && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Agent: {agentBalance.toFixed(2)} USDC
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => loadAgentBalance()}
            title="Refresh balance"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      )}

      {/* Auditor Mode Toggle */}
      {!isMobile && (
        <AuditorModeToggle enabled={auditorMode} onToggle={setAuditorMode} />
      )}

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="h-9 w-9 shrink-0 touch-manipulation"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        {theme === 'light' ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </Button>

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
