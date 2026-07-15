import request from 'supertest';
import Redis from 'ioredis';
import app from './app';
import { redis as appRedis } from './redisClient';

const redis = new Redis('redis://localhost:6379');

beforeEach(async () => {
  await redis.flushdb();
});

afterAll(async () => {
  await redis.quit();
  await appRedis.quit();
});

describe('rate limiter', () => {
  it('allows requests up to the capacity, then returns 429', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/image');
      expect(res.status).not.toBe(429);
    }

    const blocked = await request(app).get('/image');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('rate_limit_exceeded');
  });

  it('includes rate limit headers on every response', async () => {
    const res = await request(app).get('/image');
    expect(res.headers['x-ratelimit-limit']).toBe('5');
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });
});

  it('applies a different limit to /image than to other routes', async () => {
    const imageRes = await request(app).get('/image');
    expect(imageRes.headers['x-ratelimit-limit']).toBe('5');

    const otherRes = await request(app).get('/some-other-route');
    expect(otherRes.headers['x-ratelimit-limit']).toBe('20');
});

it('keeps the /image and default buckets independent', async () => {
  // Drain the default-rule bucket completely (20 tokens)
  for (let i = 0; i < 20; i++) {
    await request(app).get('/some-other-route');
  }
  const blocked = await request(app).get('/some-other-route');
  expect(blocked.status).toBe(429);

  // /image should be completely unaffected — separate bucket
  const imageRes = await request(app).get('/image');
  expect(imageRes.status).not.toBe(429);
});