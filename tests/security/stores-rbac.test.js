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
      .send({ nameEn: 'Dry Goods', category: 'ingrediant', slug: `dry-goods-${Date.now()}` });

    expect(response.status).toBe(403);
  });

  test('superadmin can create a store with localized names/descriptions and multiple images', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .field('nameEn', 'Dry Goods')
      .field('nameFr', 'Produits Secs')
      .field('nameAr', 'بضائع جافة')
      .field('category', 'ingrediant')
      .field('slug', `dry-goods-${Date.now()}`)
      .field('descriptionEn', 'Shelf-stable pantry goods')
      .field('descriptionFr', 'Produits d\'épicerie de longue conservation')
      .field('descriptionAr', 'مواد غذائية طويلة الأمد')
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'store-1.png', contentType: 'image/png' })
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'store-2.png', contentType: 'image/png' });

    expect(created.status).toBe(201);
    expect(created.body.data.name).toEqual({ en: 'Dry Goods', fr: 'Produits Secs', ar: 'بضائع جافة' });
    expect(created.body.data.description).toEqual({
      en: 'Shelf-stable pantry goods',
      fr: 'Produits d\'épicerie de longue conservation',
      ar: 'مواد غذائية طويلة الأمد'
    });
    expect(created.body.data.images).toHaveLength(2);
    expect(created.body.data.imageUrl).toBe(created.body.data.images[0]);
    created.body.data.images.forEach((imagePath) => {
      expect(imagePath).toMatch(/^\/files\/uploads\/stores\//);
    });

    const uploaded = await request(app).get(created.body.data.images[0]);
    expect(uploaded.status).toBe(200);

    const updated = await request(app)
      .patch(`/api/v1/stores/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`)
      .send({ nameEn: 'Dry Goods and Spices' });

    expect(updated.status).toBe(200);
    expect(updated.body.data.name.en).toBe('Dry Goods and Spices');
    expect(updated.body.data.images).toHaveLength(2);

    const deleted = await request(app)
      .delete(`/api/v1/stores/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`);

    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);
  });

  test('superadmin can create a store with a custom category not in the original fixed list', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .send({ nameEn: 'Bakery Corner', category: 'bakery', slug: `bakery-corner-${Date.now()}` });

    expect(created.status).toBe(201);
    expect(created.body.data.category).toBe('bakery');
  });

  test('superadmin can replace all store images on edit', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .field('nameEn', 'Bakery')
      .field('category', 'ingrediant')
      .field('slug', `bakery-${Date.now()}`)
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'bakery-1.png', contentType: 'image/png' });

    expect(created.body.data.images).toHaveLength(1);
    const originalImage = created.body.data.images[0];

    const edited = await request(app)
      .patch(`/api/v1/stores/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.token}`)
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'bakery-2.png', contentType: 'image/png' })
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'bakery-3.png', contentType: 'image/png' });

    expect(edited.status).toBe(200);
    expect(edited.body.data.images).toHaveLength(2);
    expect(edited.body.data.images).not.toContain(originalImage);
  });

  test('superadmin gets default store image when no upload is provided', async () => {
    const login = await createAndLoginSuperadmin();

    const created = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .send({ nameEn: 'Dry Goods', category: 'ingrediant', slug: `dry-goods-default-${Date.now()}` });

    expect(created.status).toBe(201);
    expect(created.body.data.images).toEqual([]);
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
      .field('nameEn', 'Dry Goods')
      .field('category', 'ingrediant')
      .field('slug', `dry-goods-invalid-ext-${Date.now()}`)
      .attach('images', PNG_IMAGE_BUFFER, { filename: 'store.txt', contentType: 'image/png' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_IMAGE');
  });

  test('superadmin cannot upload store image with invalid file content', async () => {
    const login = await createAndLoginSuperadmin();

    const response = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${login.token}`)
      .field('nameEn', 'Dry Goods')
      .field('category', 'ingrediant')
      .field('slug', `dry-goods-invalid-content-${Date.now()}`)
      .attach('images', INVALID_IMAGE_BUFFER, { filename: 'store.png', contentType: 'image/png' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_IMAGE');
  });
});
