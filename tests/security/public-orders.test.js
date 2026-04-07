const request = require('supertest');
const { app } = require('../../src/app');

describe('public guest orders', () => {
  test('guest can create a public order without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/public/orders')
      .send({
        guest: {
          name: 'Guest Buyer',
          phone: '+212600000000',
          email: 'guest@example.com',
          address: '15 Guest Street'
        },
        deliveryMode: 'instant',
        items: [{ productId: 'p-1', quantity: 2 }],
        couponCode: 'WELCOME10'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.guestName).toBe('Guest Buyer');
    expect(response.body.data.guestPhone).toBe('+212600000000');
    expect(response.body.data.guestAddress).toBe('15 Guest Street');
    expect(response.body.data.couponCode).toBe('WELCOME10');
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.items).toHaveLength(1);
  });

  test('guest order rejects missing guest information', async () => {
    const response = await request(app)
      .post('/api/v1/public/orders')
      .send({
        deliveryMode: 'instant',
        items: [{ productId: 'p-1', quantity: 1 }]
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('guest order rejects scheduled delivery without scheduledAt', async () => {
    const response = await request(app)
      .post('/api/v1/public/orders')
      .send({
        guest: {
          name: 'Guest Buyer',
          phone: '+212600000000',
          address: '15 Guest Street'
        },
        deliveryMode: 'scheduled',
        items: [{ productId: 'p-1', quantity: 1 }]
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_SCHEDULE');
  });

  test('guest order rejects unknown product', async () => {
    const response = await request(app)
      .post('/api/v1/public/orders')
      .send({
        guest: {
          name: 'Guest Buyer',
          phone: '+212600000000',
          address: '15 Guest Street'
        },
        deliveryMode: 'instant',
        items: [{ productId: 'missing-product', quantity: 1 }]
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
