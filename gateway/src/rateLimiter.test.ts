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

describe('rate limiter', () => {
  it('allows requests up to the capacity, then returns 429', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/image').set('X-Api-Key', TEST_API_KEY);
      expect(res.status).not.toBe(429);
    }
    const blocked = await request(app).get('/image').set('X-Api-Key', TEST_API_KEY);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('rate_limit_exceeded');
  });

  it('includes rate limit headers on every response', async () => {
    const res = await request(app).get('/image').set('X-Api-Key', TEST_API_KEY);
    expect(res.headers['x-ratelimit-limit']).toBe('5');
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('applies a different limit to /image than to other routes', async () => {
    const imageRes = await request(app).get('/image').set('X-Api-Key', TEST_API_KEY);
    expect(imageRes.headers['x-ratelimit-limit']).toBe('5');

    const otherRes = await request(app).get('/some-other-route').set('X-Api-Key', TEST_API_KEY);
    expect(otherRes.headers['x-ratelimit-limit']).toBe('20');
  });

  it('keeps the /image and default buckets independent', async () => {
    for (let i = 0; i < 20; i++) {
      await request(app).get('/some-other-route').set('X-Api-Key', TEST_API_KEY);
    }
    const blocked = await request(app).get('/some-other-route').set('X-Api-Key', TEST_API_KEY);
    expect(blocked.status).toBe(429);

    const imageRes = await request(app).get('/image').set('X-Api-Key', TEST_API_KEY);
    expect(imageRes.status).not.toBe(429);
  });

  it('rate-limits by authenticated identity, not IP', async () => {
    const secondKey = 'a-second-test-key';
    await seedValidApiKey(redis, secondKey);

    for (let i = 0; i < 5; i++) {
      await request(app).get('/image').set('X-Api-Key', TEST_API_KEY);
    }
    const firstBlocked = await request(app).get('/image').set('X-Api-Key', TEST_API_KEY);
    expect(firstBlocked.status).toBe(429);

    const secondRes = await request(app).get('/image').set('X-Api-Key', secondKey);
    expect(secondRes.status).not.toBe(429);
  });
});
