import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";

// In a real prod env, the Redis URL would come from env vars
const redisClient = new Redis(process.env.REDIS_URL || "redis://enterprise_cluster_redis:6379");

/**
 * Tenant-based rate limiter using Redis.
 * Applies a simple sliding window or fixed window counter.
 */
export async function tenantRateLimiter(req: Request, res: Response, next: NextFunction) {
  // If the user isn't authenticated yet, we can't rate limit by tenant.
  // This middleware should ideally run AFTER authMiddleware.
  if (!req.user || !req.user.tenantId) {
    return next();
  }

  const tenantId = req.user.tenantId;
  const currentMinute = new Date().getMinutes();
  const redisKey = `ratelimit:${tenantId}:${currentMinute}`;

  try {
    const currentCount = await redisClient.incr(redisKey);
    if (currentCount === 1) {
      // Set expiration for the key to 60 seconds
      await redisClient.expire(redisKey, 60);
    }

    const limit = 100; // e.g. 100 requests per minute per tenant
    if (currentCount > limit) {
      return res.status(429).json({ error: "Too Many Requests. Tenant limit exceeded." });
    }

    // Pass rate limit info in headers (optional but good for prod)
    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - currentCount));

    next();
  } catch (err) {
    console.error("[Rate Limiter Error]:", err);
    // Fail open in case Redis is down
    next();
  }
}
