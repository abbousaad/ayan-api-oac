const request = require('supertest');
const { app } = require('../../src/app');

describe('rate limit security', () => {
  test('blocks abusive repeated login attempts with 429', async () => {
    let lastResponse;

    for (let index = 0; index < 21; index += 1) {
      lastResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'demo', password: 'wrong-pass' });
    }

    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body.error.code).toBe('RATE_LIMITED');
  });

  test('cannot reset rate-limit by spoofing X-Forwarded-For header', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.99')
      .send({ username: 'demo', password: 'wrong-pass' });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});
