import Redis from 'ioredis';
import { hashApiKey } from './auth';

export const TEST_API_KEY = 'test-key-for-jest';

export async function seedValidApiKey(redis: Redis, key: string = TEST_API_KEY) {
  await redis.sadd('apikeys', hashApiKey(key));
}
