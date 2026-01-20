import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { WorkspaceContext as WorkspaceType } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

const defaultWorkspace: WorkspaceType = {
  id: 'ws_1',
  name: 'Default Workspace',
  avatar: undefined,
  plan: 'pro',
};

type Theme = 'light' | 'dark';

interface AppContextType {
  workspace: WorkspaceType;
  setWorkspace: (workspace: WorkspaceType) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  auditorMode: boolean;
  setAuditorMode: (enabled: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceType>(defaultWorkspace);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [auditorMode, setAuditorMode] = useState(false);
  const isMobile = useIsMobile();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile]);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <AppContext.Provider
      value={{
        workspace,
        setWorkspace,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        theme,
        setTheme,
        toggleTheme,
        auditorMode,
        setAuditorMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
