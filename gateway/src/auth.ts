/// <reference path="./types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redis } from './redisClient';

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header('x-api-key');

  if (!apiKey) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing X-API-Key header' });
    return;
  }

  const hashedKey = hashApiKey(apiKey);

  try {
    const isValid = await redis.sismember('apikeys', hashedKey);
    if (!isValid) {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid API key' });
      return;
    }
  } catch (err) {
    console.error('Redis error during authentication:', (err as Error).message);
    res.status(503).json({ error: 'service_unavailable' });
    return;
  }

  // Attach the caller's identity so later middleware (the rate limiter)
  // can key buckets per-client instead of per-IP.
  req.clientId = hashedKey;
  next();
}
