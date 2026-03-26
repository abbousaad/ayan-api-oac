const request = require('supertest');
const { app } = require('../../src/app');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');

describe('products RBAC', () => {
  test('public can access GET /api/v1/products', async () => {
    const response = await request(app).get('/api/v1/products');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('public can access GET /api/v1/products/:id', async () => {
    const response = await request(app).get('/api/v1/products/p-1');
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('p-1');
  });

  test('non authenticated user cannot create product', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .send({ storeId: 's-fruits', name: 'Desk', price: 120, stock: 6, unit: 'unit' });

    expect(response.status).toBe(401);
  });

  test('regular user cannot create product', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'demo', password: 'demo1234' });

    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ storeId: 's-fruits', name: 'Desk', price: 120, stock: 6, unit: 'unit' });

    expect(response.status).toBe(403);
  });

  test('superadmin can create, edit, and delete product', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.token}`)
      .send({ storeId: 's-fruits', name: 'Desk', price: 120, stock: 6, unit: 'unit' });

    expect(created.status).toBe(201);

    const edited = await request(app)
      .patch(`/api/v1/products/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`)
      .send({ stock: 10 });

    expect(edited.status).toBe(200);
    expect(edited.body.data.stock).toBe(10);

    const deleted = await request(app)
      .delete(`/api/v1/products/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`);

    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);
  });
});
