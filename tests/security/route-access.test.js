const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const { config } = require('../../src/config/env');

describe('route access control', () => {
  test('GET /api/v1/public works without token', async () => {
    const response = await request(app).get('/api/v1/public');

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('Public route reachable');
  });

  test('GET /api/v1/protected rejects without token', async () => {
    const response = await request(app).get('/api/v1/protected');

    expect(response.status).toBe(401);
  });

  test('GET /api/v1/protected succeeds with valid token', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'demo', password: 'demo1234' });

    const response = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.username).toBe('demo');
  });

  test('GET /api/v1/protected rejects malformed authorization header', async () => {
    const response = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', 'Bearer');

    expect(response.status).toBe(401);
  });

  test('GET /api/v1/protected rejects invalid signature token', async () => {
    const token = jwt.sign(
      { sub: 'u-1', username: 'demo', role: 'user' },
      'wrong-secret',
      { issuer: config.jwtIssuer, audience: config.jwtAudience, expiresIn: '15m', algorithm: 'HS256' }
    );

    const response = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  test('GET /api/v1/protected rejects expired token', async () => {
    const token = jwt.sign(
      { sub: 'u-1', username: 'demo', role: 'user' },
      config.jwtSecret,
      { issuer: config.jwtIssuer, audience: config.jwtAudience, expiresIn: -10, algorithm: 'HS256' }
    );

    const response = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  test('GET /api/v1/protected rejects token with wrong issuer', async () => {
    const token = jwt.sign(
      { sub: 'u-1', username: 'demo', role: 'user' },
      config.jwtSecret,
      { issuer: 'wrong-issuer', audience: config.jwtAudience, expiresIn: '15m', algorithm: 'HS256' }
    );

    const response = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  test('GET /api/v1/protected rejects token with wrong audience', async () => {
    const token = jwt.sign(
      { sub: 'u-1', username: 'demo', role: 'user' },
      config.jwtSecret,
      { issuer: config.jwtIssuer, audience: 'wrong-audience', expiresIn: '15m', algorithm: 'HS256' }
    );

    const response = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
