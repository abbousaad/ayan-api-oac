const request = require('supertest');
const { app } = require('../../src/app');

describe('docs route security', () => {
  test('docs UI is reachable without authentication', async () => {
    const response = await request(app).get('/api/v1/docs/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger-ui');
    expect(response.headers['content-security-policy']).toContain("script-src 'self' 'unsafe-inline'");
  });

  test('docs-json is reachable without authentication', async () => {
    const response = await request(app).get('/api/v1/docs-json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.0');
  });

  test('docs-json is reachable for authenticated non-superadmin users', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ username: 'demo', password: 'demo1234' });
    const response = await request(app)
      .get('/api/v1/docs-json')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.0');
  });
});
