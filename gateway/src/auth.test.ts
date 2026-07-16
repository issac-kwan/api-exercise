import request from 'supertest';
import Redis from 'ioredis';
import app from './app';
import { redis as appRedis } from './redisClient';
import { TEST_API_KEY, seedValidApiKey } from './testUtils';

const redis = new Redis('redis://localhost:6379');

beforeEach(async () => {
  await redis.flushdb();
  await seedValidApiKey(redis);
});

afterAll(async () => {
  await redis.quit();
  await appRedis.quit();
});

describe('authentication', () => {
  it('rejects requests with no API key', async () => {
    const res = await request(app).get('/image');
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid API key', async () => {
    const res = await request(app).get('/image').set('X-Api-Key', 'wrong-key');
    expect(res.status).toBe(401);
  });

  it('allows requests with a valid API key past the auth check', async () => {
    const res = await request(app).get('/image').set('X-Api-Key', TEST_API_KEY);
    expect(res.status).not.toBe(401);
  });
});
