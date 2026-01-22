/**
 * Request Deduplication Utility
 * Prevents duplicate/concurrent API calls that can cause hallucinations
 */

class RequestDeduplicator {
    private processingRequests: Map\u003cstring, boolean\u003e = new Map();
  private requestTimestamps: Map\u003cstring, number\u003e = new Map();
  private readonly TIMEOUT_MS = 30000; // 30 seconds

/**
 * Check if a request is currently being processed
 * @param requestKey Unique identifier for the request
 * @returns true if the request can proceed, false if it's a duplicate
 */
shouldProcess(requestKey: string): boolean {
    const now = Date.now();

    // Clean up old requests
    for (const [key, timestamp] of this.requestTimestamps.entries()) {
        if (now - timestamp \u003e this.TIMEOUT_MS) {
            this.processingRequests.delete(key);
            this.requestTimestamps.delete(key);
        }
    }

    // Check if already processing
    if (this.processingRequests.get(requestKey)) {
        console.warn('[RequestDeduplicator] Duplicate request blocked:', requestKey);
        return false;
    }

    // Mark as processing
    this.processingRequests.set(requestKey, true);
    this.requestTimestamps.set(requestKey, now);
    return true;
}

/**
 * Mark a request as complete
 * @param requestKey Unique identifier for the request
 */
complete(requestKey: string): void {
    this.processingRequests.delete(requestKey);
    this.requestTimestamps.delete(requestKey);
}

/**
 * Generate a request key from a message
 * @param userMessage The user's message content
 * @returns A unique key for deduplication
 */
generateKey(userMessage: string): string {
    // Use normalized content + timestamp rounded to nearest second
    const normalized = userMessage.toLowerCase().trim();
    const timestampKey = Math.floor(Date.now() / 1000);
    return `${normalized}_${timestampKey}`;
}
}

// Export singleton instance
export const requestDeduplicator = new RequestDeduplicator();
