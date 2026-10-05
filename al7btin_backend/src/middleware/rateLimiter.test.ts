import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import { createRateLimiter } from './rateLimiter.js';
import { errorHandler } from './errorHandler.js';

describe('🛡️ Backend Rate Limiting Security Test Suite', () => {
  test('1. Rate limiter tracks requests and decrements remaining quota headers', async () => {
    const app = express();
    app.use(express.json());

    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 3,
      message: 'تم تجاوز الحد المسموح',
    });

    app.get('/test-limit', limiter, (req, res) => {
      res.status(200).json({ success: true, message: 'OK' });
    });
    app.use(errorHandler);

    // Request 1
    const res1 = await request(app)
      .get('/test-limit')
      .set('x-test-ratelimit', 'true');
    assert.equal(res1.status, 200);
    assert.equal(res1.headers['x-ratelimit-limit'], '3');
    assert.equal(res1.headers['x-ratelimit-remaining'], '2');

    // Request 2
    const res2 = await request(app)
      .get('/test-limit')
      .set('x-test-ratelimit', 'true');
    assert.equal(res2.status, 200);
    assert.equal(res2.headers['x-ratelimit-remaining'], '1');

    // Request 3 (last allowed)
    const res3 = await request(app)
      .get('/test-limit')
      .set('x-test-ratelimit', 'true');
    assert.equal(res3.status, 200);
    assert.equal(res3.headers['x-ratelimit-remaining'], '0');

    // Request 4 (exceeded -> 429)
    const res4 = await request(app)
      .get('/test-limit')
      .set('x-test-ratelimit', 'true');
    assert.equal(res4.status, 429);
    assert.equal(res4.body.success, false);
    assert.equal(res4.body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(res4.headers['retry-after']);
  });
});
