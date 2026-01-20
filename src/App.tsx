import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "@/contexts/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { PageLoader } from "@/components/PageLoader";
import { PrivyProvider } from "@/components/PrivyProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthHeader } from "@/components/AuthHeader";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SecuritySetupPage = lazy(() => import("./pages/SecuritySetupPage"));

// Lazy load app pages
const DashboardPage = lazy(() => import("./pages/app/DashboardPage"));
const AgentChatPage = lazy(() => import("./pages/app/AgentChatPage"));
const PaymentIntentsPage = lazy(() => import("./pages/app/PaymentIntentsPage"));
const IntentDetailPage = lazy(() => import("./pages/app/IntentDetailPage"));
const PaymentLinkPage = lazy(() => import("./pages/app/PaymentLinkPage"));
const WalletsPage = lazy(() => import("./pages/app/WalletsPage"));
const WalletDetailPage = lazy(() => import("./pages/app/WalletDetailPage"));
const CrossChainPage = lazy(() => import("./pages/app/CrossChainPage"));
const X402DirectoryPage = lazy(() => import("./pages/app/X402DirectoryPage"));
const TransactionsPage = lazy(() => import("./pages/app/TransactionsPage"));
const GuardStudioPage = lazy(() => import("./pages/app/GuardStudioPage"));
const DevelopersPage = lazy(() => import("./pages/app/DevelopersPage"));
const CommercePluginsPage = lazy(() => import("./pages/app/CommercePluginsPage"));
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"));
const AgentWalletManagementPage = lazy(() => import("./pages/app/AgentWalletManagementPage"));

// Optimized QueryClient with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <PrivyProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <AuthHeader />
              <Routes>
              <Route 
                path="/" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Index />
                  </Suspense>
                } 
              />
                
                <Route 
                  path="/login" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <LoginPage />
                    </Suspense>
                  } 
                />

                <Route 
                  path="/security-setup" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SecuritySetupPage />
                    </Suspense>
                  } 
                />
                
                {/* App routes with shared layout - protected */}
                <Route 
                  path="/app" 
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route 
                  index 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <DashboardPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="agent" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AgentChatPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="intents" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <PaymentIntentsPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="intents/:id" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <IntentDetailPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="pay/:id" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <PaymentLinkPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="wallets" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <WalletsPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="wallets/:id" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <WalletDetailPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="crosschain" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <CrossChainPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="x402" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <X402DirectoryPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="transactions" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <TransactionsPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="guards" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <GuardStudioPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="developers" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <DevelopersPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="integrations" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <CommercePluginsPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="settings" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SettingsPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="wallet-management" 
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AgentWalletManagementPage />
                    </Suspense>
                  } 
                />
              </Route>

              <Route 
                path="*" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NotFound />
                  </Suspense>
                } 
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </PrivyProvider>
  </ThemeProvider>
);

export default App;
