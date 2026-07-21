import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export const redis = new Redis('redis://localhost:6379', { commandTimeout: 75 });

redis.on('error', (err) => {
  logger.error('Redis connection error', { message: err.message });
});

const luaScript = fs.readFileSync(path.join(__dirname, 'tokenBucket.lua'), 'utf-8');

export interface RateLimitResult {
  allowed: boolean;
  tokens: number;
}

export async function checkRateLimit(
  key: string,
  capacity: number,
  refillRate: number
): Promise<RateLimitResult> {
  const [allowed, tokens] = await redis.eval(
    luaScript, 1, key, capacity, refillRate
  ) as [number, string];
  return { allowed: allowed === 1, tokens: parseFloat(tokens) };
}

