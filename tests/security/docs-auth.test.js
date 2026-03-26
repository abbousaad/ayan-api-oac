const request = require('supertest');
const { app } = require('../../src/app');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');

describe('docs route security', () => {
  test('docs UI is reachable without authentication and includes login script', async () => {
    const response = await request(app).get('/api/v1/docs/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('/api/v1/docs-auth.js');
  });

  test('docs-json rejects unauthenticated access', async () => {
    const response = await request(app).get('/api/v1/docs-json');
    expect(response.status).toBe(401);
  });

  test('docs-json rejects authenticated non-superadmin users', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'demo', password: 'demo1234' });

    const response = await request(app)
      .get('/api/v1/docs-json')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('docs-json blocks superadmin while password change is required', async () => {
    const superadmin = await createAndLoginSuperadmin({ mustChangePassword: true, password: 'Initial1234!' });

    const response = await request(app)
      .get('/api/v1/docs-json')
      .set('Authorization', `Bearer ${superadmin.token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  test('docs-json allows superadmin after password change', async () => {
    const superadmin = await createAndLoginSuperadmin({ mustChangePassword: true, password: 'Initial1234!' });
    const changedPassword = 'Changed1234!';

    const changed = await request(app)
      .patch('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${superadmin.token}`)
      .send({ currentPassword: superadmin.password, newPassword: changedPassword });

    expect(changed.status).toBe(200);

    const relogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: superadmin.username, password: changedPassword });

    expect(relogin.status).toBe(200);

    const response = await request(app)
      .get('/api/v1/docs-json')
      .set('Authorization', `Bearer ${relogin.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.0');
  });
});
