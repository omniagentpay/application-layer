import { useState, memo, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { WorkspaceSwitcherModal } from '@/components/WorkspaceSwitcherModal';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  Wallet,
  ArrowLeftRight,
  Globe,
  List,
  Shield,
  Code,
  Settings,
  ChevronLeft,
  ChevronDown,
  Building2,
  Plus,
} from 'lucide-react';

const navItems = [
  { path: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/app/agent', icon: MessageSquare, label: 'Agent Chat' },
  { path: '/app/intents', icon: CreditCard, label: 'Payment Intents' },
  { path: '/app/wallets', icon: Wallet, label: 'Manage Wallets' },
  { path: '/app/crosschain', icon: ArrowLeftRight, label: 'Cross-chain' },
  { path: '/app/x402', icon: Globe, label: 'x402 Directory' },
  { path: '/app/transactions', icon: List, label: 'Transactions' },
  { path: '/app/guards', icon: Shield, label: 'Guard Studio' },
  { path: '/app/developers', icon: Code, label: 'Developers' },
  { path: '/app/settings', icon: Settings, label: 'Settings' },
];

const SidebarContent = memo(function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { workspace, sidebarCollapsed, setSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useApp();
  const isMobile = useIsMobile();
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);

  const handleNavClick = useMemo(() => () => {
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
    onNavigate?.();
  }, [isMobile, setMobileSidebarOpen, onNavigate]);

  const navItemsMemo = useMemo(() => navItems, []);

  return (
    <>
      {/* Header - Stripe-style */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border/50">
        {!sidebarCollapsed && (
          <span className="font-semibold text-foreground tracking-tight text-sm">OmniAgentPay</span>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 hover:bg-sidebar-accent/50"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className={cn(
              'h-4 w-4 transition-transform duration-200 text-sidebar-foreground',
              sidebarCollapsed && 'rotate-180'
            )} />
          </Button>
        )}
      </div>

      {/* Navigation - Stripe-style pill hover */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="space-y-1">
          {navItemsMemo.map((item) => {
            const isActive = item.end 
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  onClick={handleNavClick}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'hover:bg-sidebar-accent/50',
                    'focus:outline-none focus:ring-1 focus:ring-sidebar-ring focus:ring-offset-0',
                    'touch-manipulation',
                    isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                  )}
                >
                  {/* Active indicator - left accent bar with soft glow */}
                  {isActive && (
                    <>
                      <motion.span 
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[hsl(var(--success))] rounded-r-full"
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-lg bg-[hsl(var(--success))]/5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                      />
                    </>
                  )}
                  <item.icon className={cn(
                    'h-4 w-4 shrink-0 transition-colors duration-200',
                    isActive ? 'text-[hsl(var(--success))]' : 'text-sidebar-foreground/60'
                  )} />
                  {(!sidebarCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Workspace Switcher - Stripe-style */}
      <div className="border-t border-sidebar-border/50 p-3">
        <button
          onClick={() => {
            if (!sidebarCollapsed || isMobile) {
              setWorkspaceModalOpen(true);
            }
          }}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 touch-manipulation',
            'hover:bg-sidebar-accent/50 focus:outline-none focus:ring-1 focus:ring-sidebar-ring focus:ring-offset-0',
            sidebarCollapsed && !isMobile ? 'justify-center' : 'justify-between'
          )}
          aria-label="Switch workspace"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-sidebar-accent/30 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-sidebar-foreground/70" />
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <div className="text-left min-w-0 flex-1">
                <p className="font-medium text-foreground truncate text-sm">{workspace.name}</p>
                <p className="text-xs text-sidebar-foreground/50 capitalize">{workspace.plan} plan</p>
              </div>
            )}
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <ChevronDown className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
          )}
        </button>
      </div>

      <WorkspaceSwitcherModal
        open={workspaceModalOpen}
        onOpenChange={setWorkspaceModalOpen}
      />
    </>
  );
});

export const AppSidebar = memo(function AppSidebar() {
  const { mobileSidebarOpen, setMobileSidebarOpen, sidebarCollapsed } = useApp();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'fixed left-4 top-4 bottom-4 z-40 rounded-2xl bg-sidebar transition-all duration-200 ease-in-out flex flex-col',
        'hidden md:flex', // Hide on mobile, show on desktop
        'shadow-[0_10px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.03)]',
        'border border-sidebar-border/30',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
      style={{
        background: 'linear-gradient(180deg, hsl(var(--sidebar-background)) 0%, hsl(var(--sidebar-background)) 100%)',
      }}
    >
      <SidebarContent />
    </aside>
  );
});
