const request = require('supertest');
const { app } = require('../../src/app');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');

const loginAs = async (username, password) => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ username, password });

  return response.body.data.token;
};

const createLocationForBuyer = async (token, label) => {
  const response = await request(app)
    .post('/api/v1/me/locations')
    .set('Authorization', `Bearer ${token}`)
    .send({ label, address: '123 Buyer Street' });

  return response.body.data.id;
};

const createOrderForBuyer = async ({ token, locationId, items }) => {
  const response = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ locationId, deliveryMode: 'instant', items });

  return response;
};

const roundMoney = (value) => Number(Number(value).toFixed(2));

const expectPricingBreakdownToBeConsistent = (order) => {
  const subtotalAmount = roundMoney(order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0));
  const expectedGrandTotal = roundMoney(
    Math.max(0, subtotalAmount + order.deliveryFee + order.serviceFee + order.taxAmount - order.discountAmount)
  );

  expect(order.subtotalAmount).toBe(subtotalAmount);
  expect(order.grandTotal).toBe(expectedGrandTotal);
  expect(order.totalAmount).toBe(order.grandTotal);
};

describe('orders workflow security and buyer flow', () => {
  test('superadmin can confirm pending order to onpreparation', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');
    const superadminToken = (await createAndLoginSuperadmin()).token;
    const locationId = await createLocationForBuyer(buyerToken, 'Confirm Flow Home');
    const createdOrder = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: 'p-1', quantity: 1 }]
    });

    // Act
    const confirmedOrder = await request(app)
      .patch(`/api/v1/orders/${createdOrder.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${superadminToken}`);

    // Assert
    expect(createdOrder.status).toBe(201);
    expect(createdOrder.body.data.status).toBe('pending');
    expect(confirmedOrder.status).toBe(200);
    expect(confirmedOrder.body.data.status).toBe('onpreparation');
  });

  test('non-superadmin cannot confirm order', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');
    const locationId = await createLocationForBuyer(buyerToken, 'Forbidden Confirm Home');
    const createdOrder = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: 'p-1', quantity: 1 }]
    });

    // Act
    const forbidden = await request(app)
      .patch(`/api/v1/orders/${createdOrder.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${buyerToken}`);

    // Assert
    expect(createdOrder.status).toBe(201);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });

  test('livreur can accept onpreparation order to ondelivery', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');
    const superadminToken = (await createAndLoginSuperadmin()).token;
    const livreurToken = await loginAs('livreur', 'livreur1234');
    const locationId = await createLocationForBuyer(buyerToken, 'Accept Delivery Home');
    const createdOrder = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: 'p-1', quantity: 1 }]
    });

    await request(app)
      .patch(`/api/v1/orders/${createdOrder.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${superadminToken}`);

    // Act
    const accepted = await request(app)
      .patch(`/api/v1/orders/${createdOrder.body.data.id}/accept-delivery`)
      .set('Authorization', `Bearer ${livreurToken}`);

    // Assert
    expect(createdOrder.status).toBe(201);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('ondelivery');
  });

  test('livreur can mark ondelivery order to paid', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');
    const superadminToken = (await createAndLoginSuperadmin()).token;
    const livreurToken = await loginAs('livreur', 'livreur1234');
    const locationId = await createLocationForBuyer(buyerToken, 'Mark Paid Home');
    const createdOrder = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: 'p-1', quantity: 1 }]
    });

    await request(app)
      .patch(`/api/v1/orders/${createdOrder.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${superadminToken}`);

    await request(app)
      .patch(`/api/v1/orders/${createdOrder.body.data.id}/accept-delivery`)
      .set('Authorization', `Bearer ${livreurToken}`);

    // Act
    const paid = await request(app)
      .patch(`/api/v1/orders/${createdOrder.body.data.id}/mark-paid`)
      .set('Authorization', `Bearer ${livreurToken}`);

    // Assert
    expect(createdOrder.status).toBe(201);
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('paid');
  });

  test('invalid transition returns 409 conflict', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');
    const livreurToken = await loginAs('livreur', 'livreur1234');
    const locationId = await createLocationForBuyer(buyerToken, 'Invalid Transition Home');
    const createdOrder = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: 'p-1', quantity: 1 }]
    });

    // Act
    const invalid = await request(app)
      .patch(`/api/v1/orders/${createdOrder.body.data.id}/accept-delivery`)
      .set('Authorization', `Bearer ${livreurToken}`);

    // Assert
    expect(createdOrder.status).toBe(201);
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('buyer can create location and rejects missing label', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');

    // Act
    const created = await request(app)
      .post('/api/v1/me/locations')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ label: 'Buyer Home', address: '55 Main Street' });

    const invalid = await request(app)
      .post('/api/v1/me/locations')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ address: '55 Main Street' });

    // Assert
    expect(created.status).toBe(201);
    expect(created.body.data.userId).toBe('u-1');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('buyer can create order with multiple items and valid quantities', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');
    const locationId = await createLocationForBuyer(buyerToken, 'Multiple Items Home');

    // Act
    const created = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [
        { productId: 'p-1', quantity: 1.5 },
        { productId: 'p-2', quantity: 2.25 }
      ]
    });

    // Assert
    expect(created.status).toBe(201);
    expect(created.body.data.items).toHaveLength(2);
    expect(created.body.data.items[0].quantity).toBe(1.5);
    expect(created.body.data.items[1].quantity).toBe(2.25);
    expect(created.body.data.deliveryFee).toBe(3);
    expect(created.body.data.serviceFee).toBe(roundMoney(created.body.data.subtotalAmount * 0.05));
    expect(created.body.data.taxAmount).toBe(roundMoney(created.body.data.subtotalAmount * 0.1));
    expect(created.body.data.discountAmount).toBe(0);
    expectPricingBreakdownToBeConsistent(created.body.data);
  });

  test('unit-based product requires integer quantity', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');
    const superadminToken = (await createAndLoginSuperadmin()).token;
    const locationId = await createLocationForBuyer(buyerToken, 'Unit Rule Home');
    const createdProduct = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        storeId: 's-fruits',
        nameEn: 'Egg Box Unit Product',
        price: 5.25,
        stock: 40,
        unit: 'unit'
      });

    // Act
    const invalid = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: createdProduct.body.data.id, quantity: 1.5 }]
    });

    // Assert
    expect(createdProduct.status).toBe(201);
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.code).toBe('INVALID_QUANTITY');
  });

  test('buyer can list own orders with items and unauthenticated users are rejected', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');
    const locationId = await createLocationForBuyer(buyerToken, 'List Orders Home');
    const createdOrder = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [
        { productId: 'p-1', quantity: 1 },
        { productId: 'p-2', quantity: 2 }
      ]
    });

    // Act
    const listed = await request(app)
      .get('/api/v1/me/orders')
      .set('Authorization', `Bearer ${buyerToken}`);

    const unauthenticated = await request(app).get('/api/v1/me/orders');

    // Assert
    expect(createdOrder.status).toBe(201);
    expect(listed.status).toBe(200);
    const ownOrder = listed.body.data.find((order) => order.id === createdOrder.body.data.id);
    expect(ownOrder).toBeDefined();
    expect(Array.isArray(ownOrder.items)).toBe(true);
    expect(ownOrder.items).toHaveLength(2);
    expectPricingBreakdownToBeConsistent(ownOrder);
    expect(unauthenticated.status).toBe(401);
  });
});
