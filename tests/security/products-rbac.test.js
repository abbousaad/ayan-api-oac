const request = require('supertest');
const { app } = require('../../src/app');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');
const { PNG_IMAGE_BUFFER, INVALID_IMAGE_BUFFER } = require('./helpers/image-upload');

describe('products RBAC', () => {
  test('public can access GET /api/v1/products', async () => {
    const response = await request(app).get('/api/v1/products');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0].imageUrl).toBe('/files/defaults/product-default.svg');
  });

  test('public can access GET /api/v1/products/:id', async () => {
    const response = await request(app).get('/api/v1/products/p-1');
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('p-1');
  });

  test('non authenticated user cannot create product', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .send({ storeId: 's-fruits', nameEn: 'Desk', price: 120, stock: 6, unit: 'unit' });

    expect(response.status).toBe(401);
  });

  test('regular user cannot create product', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'demo', password: 'demo1234' });

    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ storeId: 's-fruits', nameEn: 'Desk', price: 120, stock: 6, unit: 'unit' });

    expect(response.status).toBe(403);
  });

  test('superadmin can create a product with localized names/descriptions and multiple images', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.token}`)
      .field('storeId', 's-fruits')
      .field('nameEn', 'Desk')
      .field('nameFr', 'Bureau')
      .field('nameAr', 'مكتب')
      .field('price', '120')
      .field('stock', '6')
      .field('descriptionEn', 'A sturdy desk')
      .field('descriptionFr', 'Un bureau solide')
      .field('descriptionAr', 'مكتب متين')
      .field('unit', 'unit')
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'product-1.png', contentType: 'image/png' })
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'product-2.png', contentType: 'image/png' });

    expect(created.status).toBe(201);
    expect(created.body.data.name).toEqual({ en: 'Desk', fr: 'Bureau', ar: 'مكتب' });
    expect(created.body.data.description).toEqual({ en: 'A sturdy desk', fr: 'Un bureau solide', ar: 'مكتب متين' });
    expect(created.body.data.images).toHaveLength(2);
    expect(created.body.data.imageUrl).toBe(created.body.data.images[0]);
    created.body.data.images.forEach((imagePath) => {
      expect(imagePath).toMatch(/^\/files\/uploads\/products\//);
    });

    const uploaded = await request(app).get(created.body.data.images[0]);
    expect(uploaded.status).toBe(200);

    const edited = await request(app)
      .patch(`/api/v1/products/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`)
      .send({ stock: 10 });

    expect(edited.status).toBe(200);
    expect(edited.body.data.stock).toBe(10);
    expect(edited.body.data.images).toHaveLength(2);

    const deleted = await request(app)
      .delete(`/api/v1/products/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`);

    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);
  });

  test('superadmin can replace all product images on edit', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.token}`)
      .field('storeId', 's-fruits')
      .field('nameEn', 'Chair')
      .field('price', '80')
      .field('stock', '4')
      .field('unit', 'unit')
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'chair-1.png', contentType: 'image/png' });

    expect(created.body.data.images).toHaveLength(1);
    const originalImage = created.body.data.images[0];

    const edited = await request(app)
      .patch(`/api/v1/products/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`)
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'chair-2.png', contentType: 'image/png' })
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'chair-3.png', contentType: 'image/png' });

    expect(edited.status).toBe(200);
    expect(edited.body.data.images).toHaveLength(2);
    expect(edited.body.data.images).not.toContain(originalImage);
  });

  test('superadmin gets default product image when no upload is provided', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.token}`)
      .send({ storeId: 's-fruits', nameEn: 'Default Desk', price: 120, stock: 6, unit: 'unit' });

    expect(created.status).toBe(201);
    expect(created.body.data.images).toEqual([]);
    expect(created.body.data.imageUrl).toBe('/files/defaults/product-default.svg');
  });

  test('superadmin cannot upload product image with invalid extension', async () => {
    const login = await createAndLoginSuperadmin();

    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.token}`)
      .field('storeId', 's-fruits')
      .field('nameEn', 'Bad Desk')
      .field('price', '120')
      .field('stock', '6')
      .field('unit', 'unit')
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'product.txt', contentType: 'image/png' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_IMAGE');
  });

  test('superadmin cannot upload product image with invalid file content', async () => {
    const login = await createAndLoginSuperadmin();

    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${login.token}`)
      .field('storeId', 's-fruits')
      .field('nameEn', 'Bad Desk Content')
      .field('price', '120')
      .field('stock', '6')
      .field('unit', 'unit')
      .attach('images', INVALID_IMAGE_BUFFER, { filename: 'product.png', contentType: 'image/png' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_IMAGE');
  });
});
