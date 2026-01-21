import { lazy, Suspense, memo } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageLoader } from '@/components/PageLoader';
import { PageTransition } from '@/components/PageTransition';
import { DevModeBanner } from '@/components/DevModeBanner';
import { UsernameWarningBanner } from '@/components/UsernameWarningBanner';

// Lazy load heavy components for better code splitting
const AppSidebar = lazy(() => import('@/components/AppSidebar').then(m => ({ default: m.AppSidebar })));
const AppNavbar = lazy(() => import('@/components/AppNavbar').then(m => ({ default: m.AppNavbar })));

export const AppLayout = memo(function AppLayout() {
  const { sidebarCollapsed } = useApp();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <DevModeBanner />
      <Suspense fallback={null}>
        <AppSidebar />
        <AppNavbar />
      </Suspense>
      <main
        className={cn(
          'min-h-screen transition-all duration-200 ease-in-out pt-16',
          isMobile
            ? 'ml-0'
            : sidebarCollapsed
              ? 'ml-[calc(var(--sidebar-collapsed-width)+2rem)]'
              : 'ml-[calc(var(--sidebar-width)+2rem)]'
        )}
      >
        <UsernameWarningBanner />
        <div className="page-container">
          <Suspense fallback={<PageLoader text="Loading page..." />}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </div>
      </main>
    </div>
  );
});
