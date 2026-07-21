import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../logging/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
redis.on('error', (err) => {
  logger.error('Redis connection error (classification cache)', { message: err.message });
});

const CACHE_TTL_SECONDS = 3600;

export function hashFileContent(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function getCachedClassification(contentHash: string): Promise<string | null> {
  try {
    return await redis.get(`classification:${contentHash}`);
  } catch (err) {
    // Cache is an optimization, not a safety control — if Redis is down,
    // degrade to "always classify" rather than fail the request. This is
    // the opposite call from auth's fail-closed default, and deliberately
    // so: fail-open/fail-closed isn't a fixed rule, it depends on what
    // the check is actually protecting.
    logger.error('Cache read failed — classifying without cache', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return null;
  }
}

export async function setCachedClassification(contentHash: string, result: unknown): Promise<void> {
  try {
    await redis.set(`classification:${contentHash}`, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    logger.error('Cache write failed — result not cached', {
      message: err instanceof Error ? err.message : 'unknown',
    });
  }
}
