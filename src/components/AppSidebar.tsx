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
  { path: '/app/wallets', icon: Wallet, label: 'Wallets' },
  { path: '/app/wallet-management', icon: Wallet, label: 'Agent Wallet' },
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
      {/* Header - Premium framing */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <span className="font-semibold text-foreground tracking-tight">OmniAgentPay</span>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 hover:bg-sidebar-accent"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className={cn(
              'h-4 w-4 transition-transform duration-200',
              sidebarCollapsed && 'rotate-180'
            )} />
          </Button>
        )}
      </div>

      {/* Navigation - Premium spacing */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
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
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-sidebar',
                    'touch-manipulation',
                    isActive 
                      ? 'bg-sidebar-accent/50 text-sidebar-accent-foreground font-semibold' 
                      : 'text-sidebar-foreground'
                  )}
                >
                  {/* Premium active indicator - thin left bar */}
                  {isActive && (
                    <motion.span 
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
                    />
                  )}
                  <item.icon className={cn(
                    'h-5 w-5 shrink-0 transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-sidebar-foreground'
                  )} />
                  {(!sidebarCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Workspace Switcher - Premium */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => {
            if (!sidebarCollapsed || isMobile) {
              setWorkspaceModalOpen(true);
            }
          }}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm transition-all duration-200 touch-manipulation',
            'hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-sidebar',
            'active:scale-[0.98]',
            sidebarCollapsed && !isMobile ? 'justify-center' : 'justify-between'
          )}
          aria-label="Switch workspace"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <div className="text-left min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{workspace.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{workspace.plan} plan</p>
              </div>
            )}
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
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
        'fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-200 ease-in-out flex flex-col',
        'hidden md:flex', // Hide on mobile, show on desktop
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      <SidebarContent />
    </aside>
  );
});
