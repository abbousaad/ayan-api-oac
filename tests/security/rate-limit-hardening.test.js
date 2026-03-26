const request = require('supertest');
const { app } = require('../../src/app');

describe('rate limit hardening checks', () => {
  test('returns 429 with rate limit headers after abusive login burst', async () => {
    let response;

    for (let index = 0; index < 21; index += 1) {
      response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: `abuse-${Date.now()}`, password: 'wrong-pass' });
    }

    expect(response.status).toBe(429);
    expect(response.headers).toHaveProperty('retry-after');
    expect(response.headers).toHaveProperty('ratelimit');
  });

  test('does not allow rate-limit bypass via X-Forwarded-For spoofing when proxy is enabled', async () => {
    app.set('trust proxy', true);

    for (let index = 0; index < 21; index += 1) {
      await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '203.0.113.10')
        .send({ username: `spoof-${Date.now()}`, password: 'wrong-pass' });
    }

    const bypassAttempt = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.11')
      .send({ username: `spoof-${Date.now()}`, password: 'wrong-pass' });

    app.set('trust proxy', false);

    expect(bypassAttempt.status).toBe(429);
  });
});
