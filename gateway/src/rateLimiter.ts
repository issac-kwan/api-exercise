import { Request, Response, NextFunction } from 'express';
import { getClientId } from './clientId';
import { checkRateLimit } from './redisClient';
import { resolveRule } from './rules';
import { logger } from '../../logging/logger';
import { sendError } from './httpError';

export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientId = getClientId(req);

  if (!clientId) {
    logger.error('Could not determine a client identity for request', { path: req.path });
    return sendError(res, 400, 'bad_request', 'Unable to identify client');
  }

  const rule = resolveRule(req);
  const bucketKey = `ratelimit:${rule.name}:${clientId}`;

  try {
    const result = await checkRateLimit(bucketKey, rule.capacity, rule.refillRate);
    res.set('X-RateLimit-Limit', String(rule.capacity));
    res.set('X-RateLimit-Remaining', String(Math.floor(result.tokens)));

    if (!result.allowed) {
      res.set('Retry-After', '1');
      return sendError(
        res, 429, 'rate_limit_exceeded',
        `Rate limit exceeded for "${rule.name}". Try again later.`
      );
    }

    return next();
  } catch (err) {
    logger.error('Redis error in rate limiter — blocking request', {
      rule: rule.name,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return sendError(res, 503, 'service_unavailable', 'Rate limiting temporarily unavailable');
  }
}
