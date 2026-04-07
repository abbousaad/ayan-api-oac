const request = require('supertest');
const { app } = require('../../src/app');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');

const loginAs = async (username, password) => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ username, password });

  return response.body.data.token;
};

describe('currency settings', () => {
  test('authenticated users can read currency code', async () => {
    const buyerToken = await loginAs('demo', 'demo1234');

    const response = await request(app)
      .get('/api/v1/settings/currency')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.currencyCode).toBeDefined();
  });

  test('superadmin can update currency code', async () => {
    const superadminToken = (await createAndLoginSuperadmin()).token;

    const response = await request(app)
      .patch('/api/v1/settings/currency')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ currencyCode: 'MAD' });

    expect(response.status).toBe(200);
    expect(response.body.data.currencyCode).toBe('MAD');
  });

  test('non-superadmin cannot update currency code', async () => {
    const buyerToken = await loginAs('demo', 'demo1234');

    const response = await request(app)
      .patch('/api/v1/settings/currency')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ currencyCode: 'EUR' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('rejects invalid currency code', async () => {
    const superadminToken = (await createAndLoginSuperadmin()).token;

    const response = await request(app)
      .patch('/api/v1/settings/currency')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ currencyCode: 'usd' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
