import { Request, Response, NextFunction } from 'express';
import { getClientId } from './clientId';
import { checkRateLimit } from './redisClient';
import { resolveRule } from './rules';

export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientId = getClientId(req);

  if (!clientId) { 
    console.error('[rate-limiter] could not determine a client identity for request');
    res.status(400).json({ error: 'bad_request', message: 'Unable to identify client' });
    return;
  }
  
  const rule = resolveRule(req);
  const bucketKey = `ratelimit:${rule.name}:${clientId}`;

  try {
    const result = await checkRateLimit(bucketKey, rule.capacity, rule.refillRate);
    res.set('X-RateLimit-Limit', String(rule.capacity));
    res.set('X-RateLimit-Remaining', String(Math.floor(result.tokens)));

    if (!result.allowed) {
      res.set('Retry-After', '1');
      res.status(429).json({ error: 'rate_limit_exceeded' });
      return;
    }
    next();
  } catch (err) {
    console.error('Redis error, blocking request:', (err as Error).message);
    res.status(503).json({ error: 'service_unavailable' });
  }
}
