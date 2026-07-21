import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redis } from './redisClient';
import { logger } from './logger';
import { sendError } from './httpError';

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header('x-api-key');

  if (!apiKey) {
    return sendError(res, 401, 'unauthorized', 'Missing X-API-Key header');
  }

  const hashedKey = hashApiKey(apiKey);

  try {
    const isValid = await redis.exists(`apikey:${hashedKey}`);
    if (!isValid) {
      logger.warn('Rejected request with invalid API key', { path: req.path });
      return sendError(res, 401, 'unauthorized', 'Invalid API key');
    }
  } catch (err) {
    logger.error('Redis error during authentication', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return sendError(res, 503, 'service_unavailable', 'Authentication temporarily unavailable');
  }

  req.clientId = hashedKey;
  return next();
}
