/**
 * API Client - Centralized HTTP client for backend API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface ApiError {
  error: string;
  details?: string;
}

// Global store for Privy user ID (set by AuthHeader component)
let globalPrivyUserId: string | null = null;

export function setGlobalPrivyUserId(userId: string | null) {
  globalPrivyUserId = userId;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getPrivyUserId(): string | null {
    // Use global user ID set by AuthHeader
    if (globalPrivyUserId) {
      return globalPrivyUserId;
    }
    
    // Fallback: Try to get from window (for dev auth)
    if (typeof window !== 'undefined') {
      const devAuthState = (window as any).__DEV_AUTH_STATE__;
      if (devAuthState?.enabled && devAuthState?.privyUserId) {
        return devAuthState.privyUserId;
      }
    }
    
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get Privy user ID if available (synchronous call)
    const privyUserId = this.getPrivyUserId();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    
    // Add Privy user ID header if available and not already set
    if (privyUserId && !(headers as any)['X-Privy-User-Id']) {
      (headers as any)['X-Privy-User-Id'] = privyUserId;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      // Prefer details over error for more specific messages
      throw new Error(error.details || error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: { params?: Record<string, unknown> }): Promise<T> {
    let url = endpoint;
    if (options?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
