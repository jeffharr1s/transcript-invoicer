/**
 * In-memory sliding window rate limiter.
 * For production at scale, swap this for Redis (Upstash) — same interface.
 *
 * Each limiter tracks requests per identifier (user ID or IP) within a window.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

export function createRateLimiter(name: string, config: RateLimiterConfig) {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  return {
    /**
     * Check if a request is allowed.
     * Returns { allowed, remaining, resetMs }
     */
    check(identifier: string): {
      allowed: boolean;
      remaining: number;
      resetMs: number;
    } {
      const now = Date.now();
      const windowStart = now - config.windowMs;

      let entry = store.get(identifier);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(identifier, entry);
      }

      // Remove expired timestamps
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

      const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
      const oldestInWindow = entry.timestamps[0] || now;
      const resetMs = oldestInWindow + config.windowMs - now;

      if (entry.timestamps.length >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetMs };
      }

      entry.timestamps.push(now);
      return { allowed: true, remaining: remaining - 1, resetMs };
    },

    /** Reset a specific identifier (e.g., after plan upgrade) */
    reset(identifier: string) {
      store.delete(identifier);
    },
  };
}

// ─── Pre-configured limiters ────────────────────────────────────

/** AI analysis: 10 requests per minute per user */
export const analysisLimiter = createRateLimiter("analysis", {
  maxRequests: 10,
  windowMs: 60 * 1000,
});

/** General API: 60 requests per minute per user */
export const apiLimiter = createRateLimiter("api", {
  maxRequests: 60,
  windowMs: 60 * 1000,
});

/** Auth attempts: 5 per minute per IP */
export const authLimiter = createRateLimiter("auth", {
  maxRequests: 5,
  windowMs: 60 * 1000,
});
