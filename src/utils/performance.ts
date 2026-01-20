/**
 * Performance utilities for optimizing the application
 */

/**
 * Preload a route component on hover or other interactions
 */
export function preloadRoute(importFn: () => Promise<unknown>) {
  importFn();
}

/**
 * Defer non-critical updates using requestIdleCallback
 */
export function deferUpdate(callback: () => void) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 0);
  }
}

/**
 * Batch multiple state updates
 */
export function batchUpdates(updates: Array<() => void>) {
  if (updates.length === 0) return;
  
  // Use React's automatic batching in React 18+
  updates.forEach(update => update());
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
