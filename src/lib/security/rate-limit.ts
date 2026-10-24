import "server-only";
import { createHash } from "node:crypto";
import { sqlite } from "@/lib/db/server";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function hashClientIp(ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? "skyline-local-rate-limit-v1";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * A single SQLite transaction makes the increment atomic across concurrent requests
 * handled by this application process/DB file. It deliberately avoids a process-local
 * Map, which would reset on restart and be inconsistent across workers.
 */
export function consumeRateLimit(key: string, maxRequests = 5, windowMs = 10 * 60 * 1000): RateLimitResult {
  const now = Date.now();
  const transaction = sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM rate_limits WHERE window_started_at + ? <= ?").run(windowMs, now);
    const current = sqlite.prepare("SELECT window_started_at AS windowStartedAt, request_count AS requestCount FROM rate_limits WHERE key = ?").get(key) as
      | { windowStartedAt: number; requestCount: number }
      | undefined;

    if (!current || now - current.windowStartedAt >= windowMs) {
      sqlite.prepare(`INSERT INTO rate_limits (key, window_started_at, request_count)
        VALUES (?, ?, 1)
        ON CONFLICT(key) DO UPDATE SET window_started_at = excluded.window_started_at, request_count = 1`).run(key, now);
      return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
    }

    if (current.requestCount >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - current.windowStartedAt)) / 1000)),
      };
    }

    sqlite.prepare("UPDATE rate_limits SET request_count = request_count + 1 WHERE key = ?").run(key);
    return { allowed: true, remaining: maxRequests - current.requestCount - 1, retryAfterSeconds: 0 };
  });

  return transaction();
}
