import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { logger } from '../../logging/logger';

export const redis = new Redis('redis://localhost:6379');

// Node's EventEmitter throws if an 'error' event has no listener attached
// to it — without this handler, a Redis connection hiccup (a restart, a
// dropped connection) would become an *uncaught exception* and crash the
// entire gateway process. This matters more now than it did before: we
// just wired index.ts to call process.exit(1) on any uncaught exception,
// which means a totally recoverable, temporary Redis blip could have
// taken the whole gateway down with it. Logging the error here lets
// ioredis handle reconnection on its own in the background, while we
// just record that it happened.
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
