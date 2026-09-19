/**
 * In-memory fixed-window rate limiter, matching the pattern used across
 * other findmalek projects (e.g. sonaraem's `packages/orpc/src/utils/rate-limiter.ts`).
 *
 * Tradeoff, same as there: a single-process Map. Fine for this site's
 * traffic (one small Vercel deployment), but limits are NOT shared across
 * serverless function instances -- swap for Upstash Redis (or similar)
 * before this needs to hold under multi-instance concurrent load. Adding
 * that now would be solving a scaling problem this site doesn't have yet.
 */

interface RateLimitConfig {
  max: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

class MemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  set(key: string, value: { count: number; resetTime: number }) {
    this.store.set(key, value);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) this.store.delete(key);
    }
  }
}

const memoryStore = new MemoryStore();

if (typeof setInterval !== "undefined") {
  setInterval(() => memoryStore.cleanup(), 60 * 1000);
}

export class RateLimiter {
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = { keyPrefix: "ratelimit", ...config };
  }

  check(identifier: string): RateLimitResult {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.config.windowMs;
      memoryStore.set(key, { count: 1, resetTime });
      return { success: true, remaining: this.config.max - 1, reset: resetTime };
    }

    const count = entry.count + 1;
    memoryStore.set(key, { count, resetTime: entry.resetTime });

    if (count > this.config.max) {
      return {
        success: false,
        remaining: 0,
        reset: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    return { success: true, remaining: this.config.max - count, reset: entry.resetTime };
  }

  getIdentifier(headers: Headers): string {
    const vercelIp = headers.get("x-vercel-forwarded-for");
    const forwardedFor = headers.get("x-forwarded-for");
    const realIp = headers.get("x-real-ip");

    const ip = vercelIp?.split(",")[0]?.trim() ?? forwardedFor?.split(",")[0]?.trim() ?? realIp;

    return ip ? `ip:${ip}` : "anonymous";
  }
}

/**
 * Two layers, both must pass: `perIp` stops any one visitor from hammering
 * the endpoint (generous enough for real typing -- a few requests per
 * keystroke burst), and `global` is the hard backstop against the actual
 * fear here (a distributed hit or scraper running up the TypeSafe bill)
 * regardless of how requests are spread across IPs.
 */
export const suggestRateLimiters = {
  perIp: new RateLimiter({ max: 30, windowMs: 60 * 1000, keyPrefix: "suggest:ip" }),
  global: new RateLimiter({ max: 3000, windowMs: 24 * 60 * 60 * 1000, keyPrefix: "suggest:global" }),
};
