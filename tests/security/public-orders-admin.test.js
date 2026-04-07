const request = require('supertest');
const { app } = require('../../src/app');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');

const loginAs = async (username, password) => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ username, password });

  return response.body.data.token;
};

const createPublicOrder = async (overrides = {}) => {
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
      items: [{ productId: 'p-1', quantity: 1 }],
      ...overrides
    });

  return response;
};

describe('public orders admin management', () => {
  test('superadmin and livreur can list public orders with items', async () => {
    const createdOrder = await createPublicOrder();
    const superadminToken = (await createAndLoginSuperadmin()).token;
    const livreurToken = await loginAs('livreur', 'livreur1234');

    const superadminList = await request(app)
      .get('/api/v1/public-orders')
      .set('Authorization', `Bearer ${superadminToken}`);

    const livreurList = await request(app)
      .get('/api/v1/public-orders')
      .set('Authorization', `Bearer ${livreurToken}`);

    expect(createdOrder.status).toBe(201);
    expect(superadminList.status).toBe(200);
    expect(livreurList.status).toBe(200);

    const superadminOrder = superadminList.body.data.find((order) => order.id === createdOrder.body.data.id);
    const livreurOrder = livreurList.body.data.find((order) => order.id === createdOrder.body.data.id);

    expect(superadminOrder).toBeDefined();
    expect(livreurOrder).toBeDefined();
    expect(superadminOrder.items).toHaveLength(1);
    expect(livreurOrder.items).toHaveLength(1);
  });

  test('rejects invalid status filter', async () => {
    const superadminToken = (await createAndLoginSuperadmin()).token;
    const response = await request(app)
      .get('/api/v1/public-orders?status=invalid')
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('livreur cannot confirm public order', async () => {
    const createdOrder = await createPublicOrder();
    const livreurToken = await loginAs('livreur', 'livreur1234');

    const forbidden = await request(app)
      .patch(`/api/v1/public-orders/${createdOrder.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${livreurToken}`);

    expect(createdOrder.status).toBe(201);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });

  test('public order status workflow mirrors orders', async () => {
    const createdOrder = await createPublicOrder();
    const superadminToken = (await createAndLoginSuperadmin()).token;
    const livreurToken = await loginAs('livreur', 'livreur1234');

    const confirmed = await request(app)
      .patch(`/api/v1/public-orders/${createdOrder.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${superadminToken}`);

    const accepted = await request(app)
      .patch(`/api/v1/public-orders/${createdOrder.body.data.id}/accept-delivery`)
      .set('Authorization', `Bearer ${livreurToken}`);

    const paid = await request(app)
      .patch(`/api/v1/public-orders/${createdOrder.body.data.id}/mark-paid`)
      .set('Authorization', `Bearer ${livreurToken}`);

    expect(createdOrder.status).toBe(201);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('onpreparation');
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('ondelivery');
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('paid');
  });

  test('invalid transition returns 409 conflict', async () => {
    const createdOrder = await createPublicOrder();
    const livreurToken = await loginAs('livreur', 'livreur1234');

    const invalid = await request(app)
      .patch(`/api/v1/public-orders/${createdOrder.body.data.id}/accept-delivery`)
      .set('Authorization', `Bearer ${livreurToken}`);

    expect(createdOrder.status).toBe(201);
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('missing public order returns 404', async () => {
    const superadminToken = (await createAndLoginSuperadmin()).token;
    const response = await request(app)
      .patch('/api/v1/public-orders/missing-order/confirm')
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
