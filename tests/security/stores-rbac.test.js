const request = require('supertest');
const { app } = require('../../src/app');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');

describe('stores RBAC', () => {
  test('public can list stores', async () => {
    const response = await request(app).get('/api/v1/stores');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('public can view store products', async () => {
    const response = await request(app).get('/api/v1/stores/s-fruits/products');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('regular user cannot create store', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'demo', password: 'demo1234' });

    const response = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ name: 'Dry Goods', category: 'ingrediant', slug: `dry-goods-${Date.now()}` });

    expect(response.status).toBe(403);
  });

  test('superadmin can create, update and delete store', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .send({ name: 'Dry Goods', category: 'ingrediant', slug: `dry-goods-${Date.now()}` });

    expect(created.status).toBe(201);

    const updated = await request(app)
      .patch(`/api/v1/stores/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`)
      .send({ name: 'Dry Goods and Spices' });

    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Dry Goods and Spices');

    const deleted = await request(app)
      .delete(`/api/v1/stores/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`);

    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);
  });
});
