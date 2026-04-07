const request = require('supertest');
const { app } = require('../../src/app');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');
const { PNG_IMAGE_BUFFER, INVALID_IMAGE_BUFFER } = require('./helpers/image-upload');

describe('stores RBAC', () => {
  test('public can list stores', async () => {
    const response = await request(app).get('/api/v1/stores');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0].imageUrl).toBe('/files/defaults/store-default.svg');
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

  test('superadmin can create a store with uploaded image and public file url', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .field('name', 'Dry Goods')
      .field('category', 'ingrediant')
      .field('slug', `dry-goods-${Date.now()}`)
      .attach('image', PNG_IMAGE_BUFFER, { filename: 'store.png', contentType: 'image/png' });

    expect(created.status).toBe(201);
    expect(created.body.data.imageUrl).toMatch(/^\/files\/uploads\/stores\//);

    const uploaded = await request(app).get(created.body.data.imageUrl);
    expect(uploaded.status).toBe(200);

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

  test('superadmin gets default store image when no upload is provided', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .send({ name: 'Dry Goods', category: 'ingrediant', slug: `dry-goods-default-${Date.now()}` });

    expect(created.status).toBe(201);
    expect(created.body.data.imageUrl).toBe('/files/defaults/store-default.svg');

    const deleted = await request(app)
      .delete(`/api/v1/stores/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`);

    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);
  });

  test('superadmin cannot upload store image with invalid extension', async () => {
    const login = await createAndLoginSuperadmin();

    const response = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .field('name', 'Dry Goods')
      .field('category', 'ingrediant')
      .field('slug', `dry-goods-invalid-ext-${Date.now()}`)
      .attach('image', PNG_IMAGE_BUFFER, { filename: 'store.txt', contentType: 'image/png' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_IMAGE');
  });

  test('superadmin cannot upload store image with invalid file content', async () => {
    const login = await createAndLoginSuperadmin();

    const response = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .field('name', 'Dry Goods')
      .field('category', 'ingrediant')
      .field('slug', `dry-goods-invalid-content-${Date.now()}`)
      .attach('image', INVALID_IMAGE_BUFFER, { filename: 'store.png', contentType: 'image/png' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_IMAGE');
  });
});
