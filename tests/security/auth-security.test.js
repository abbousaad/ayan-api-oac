const request = require('supertest');
const { app } = require('../../src/app');
const { securityLogger } = require('../../src/logging/logger');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');

describe('authentication security', () => {
  test('register creates user and rejects duplicate username', async () => {
    const username = `user-${Date.now()}`;

    const created = await request(app)
      .post('/api/v1/auth/register')
      .send({ username, password: 'strongpass1' });

    expect(created.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/v1/auth/register')
      .send({ username, password: 'strongpass1' });

    expect(duplicate.status).toBe(409);
  });

  test('register ignores malicious role override attempt', async () => {
    const username = `malicious-${Date.now()}`;
    const spy = jest.spyOn(securityLogger, 'error').mockImplementation(() => {});

    const registered = await request(app)
      .post('/api/v1/auth/register')
      .send({ username, password: 'strongpass1', role: 'superadmin' });

    expect(registered.status).toBe(201);
    expect(registered.body.data.role).toBe('user');
    expect(spy).toHaveBeenCalledWith(
      'CRITICAL_SECURITY_EVENT: Register role override attempt',
      expect.objectContaining({ username, attemptedRole: 'superadmin' })
    );

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'strongpass1' });

    const createProduct = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ storeId: 's-fruits', nameEn: 'Privilege Escalation Product', price: 10, stock: 1, unit: 'unit' });

    expect(createProduct.status).toBe(403);
    spy.mockRestore();
  });

  test('change-password requires authentication', async () => {
    const response = await request(app)
      .patch('/api/v1/auth/change-password')
      .send({ currentPassword: 'demo1234', newPassword: 'newpass1234' });

    expect(response.status).toBe(401);
  });

  test('change-password updates user credentials', async () => {
    const username = `cp-${Date.now()}`;
    const oldPassword = 'oldpass1234';
    const newPassword = 'newpass1234';

    await request(app)
      .post('/api/v1/auth/register')
      .send({ username, password: oldPassword });

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: oldPassword });

    const changed = await request(app)
      .patch('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ currentPassword: oldPassword, newPassword });

    expect(changed.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: oldPassword });

    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: newPassword });

    expect(newLogin.status).toBe(200);
  });

  test('superadmin must change password before privileged access', async () => {
    const superadmin = await createAndLoginSuperadmin({ mustChangePassword: true, password: 'Initial1234!' });

    const blocked = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${superadmin.token}`)
      .send({ storeId: 's-fruits', nameEn: 'Blocked Product', price: 10, stock: 1, unit: 'unit' });

    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

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

    const allowed = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${relogin.body.data.token}`)
      .send({ storeId: 's-fruits', nameEn: 'Allowed Product', price: 10, stock: 1, unit: 'unit' });

    expect(allowed.status).toBe(201);
  });

  test('logs security event after more than four failed attempts', async () => {
    const spy = jest.spyOn(securityLogger, 'info').mockImplementation(() => {});

    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'demo', password: 'bad-pass' });
    }

    expect(spy).toHaveBeenCalledWith(
      'Repeated authentication failures detected',
      expect.objectContaining({ username: 'demo', password: '[REDACTED]' })
    );

    spy.mockRestore();
  });

  test('logs potential IDOR attempt and returns 403', async () => {
    const spy = jest.spyOn(securityLogger, 'info').mockImplementation(() => {});
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'demo', password: 'demo1234' });

    const response = await request(app)
      .get('/api/v1/protected/users/u-2')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(response.status).toBe(403);
    expect(spy).toHaveBeenCalledWith(
      'Potential IDOR attempt detected',
      expect.objectContaining({ actorId: 'u-1', requestedResourceId: 'u-2' })
    );

    spy.mockRestore();
  });
});
