import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler.js';

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateLimitStore>();

export function createRateLimiter(options: { maxRequests: number; windowMs: number }) {
  const { maxRequests, windowMs } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, skip rate limiting unless specifically testing rate limits
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit']) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = ipMap.get(ip);

    if (!record || now > record.resetAt) {
      ipMap.set(ip, {
        count: 1,
        resetAt: now + windowMs
      });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, maxRequests - record.count);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return next(
        new AppError(
          'Too many requests. Please try again shortly.',
          429,
          'RATE_LIMIT_EXCEEDED',
          { retryAfterSeconds }
        )
      );
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000
});

export const aiRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000
});

export const renderRateLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000
});

export const publishRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000
});

export const autonomousRateLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000
});

export const generalApiLimiter = createRateLimiter({
  maxRequests: 200,
  windowMs: 60 * 1000
});

// Global cleanup interval for stale rate limit keys
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipMap.entries()) {
    if (now > value.resetAt) {
      ipMap.delete(key);
    }
  }
}, 60000).unref();

