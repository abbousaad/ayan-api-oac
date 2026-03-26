const request = require('supertest');
const { app } = require('../../src/app');
const { createAndLoginSuperadmin } = require('./helpers/superadmin-auth');

const DEFAULT_PRICING_CONFIG = {
  deliveryFee: 3,
  serviceFeeRate: 0.05,
  taxRate: 0.1,
  discountRate: 0
};

const roundMoney = (value) => Number(Number(value).toFixed(2));

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

const patchPricingConfig = async (token, payload) => {
  const response = await request(app)
    .patch('/api/v1/orders/pricing-config')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  return response;
};

let superadminToken;

beforeEach(async () => {
  superadminToken = (await createAndLoginSuperadmin()).token;
  await patchPricingConfig(superadminToken, DEFAULT_PRICING_CONFIG);
});

afterAll(async () => {
  const token = (await createAndLoginSuperadmin()).token;
  await patchPricingConfig(token, DEFAULT_PRICING_CONFIG);
});

describe('orders pricing config RBAC', () => {
  test('superadmin can get and patch pricing config', async () => {
    // Arrange
    const nextConfig = {
      deliveryFee: 6.5,
      serviceFeeRate: 0.08,
      taxRate: 0.12,
      discountRate: 0.03
    };

    // Act
    const current = await request(app)
      .get('/api/v1/orders/pricing-config')
      .set('Authorization', `Bearer ${superadminToken}`);

    const patched = await patchPricingConfig(superadminToken, nextConfig);

    const reloaded = await request(app)
      .get('/api/v1/orders/pricing-config')
      .set('Authorization', `Bearer ${superadminToken}`);

    // Assert
    expect(current.status).toBe(200);
    expect(current.body.data).toEqual(DEFAULT_PRICING_CONFIG);
    expect(patched.status).toBe(200);
    expect(patched.body.data).toEqual(nextConfig);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.data).toEqual(nextConfig);
  });

  test('non-superadmin is forbidden from pricing config endpoints', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');

    // Act
    const getResponse = await request(app)
      .get('/api/v1/orders/pricing-config')
      .set('Authorization', `Bearer ${buyerToken}`);

    const patchResponse = await patchPricingConfig(buyerToken, { deliveryFee: 4 });

    // Assert
    expect(getResponse.status).toBe(403);
    expect(getResponse.body.error.code).toBe('FORBIDDEN');
    expect(patchResponse.status).toBe(403);
    expect(patchResponse.body.error.code).toBe('FORBIDDEN');
  });

  test('pricing config patch rejects invalid values with 422', async () => {
    // Arrange
    const invalidPayloads = [
      { deliveryFee: -1 },
      { serviceFeeRate: 1.01 },
      { taxRate: 1.5 },
      { discountRate: 1.2 }
    ];

    // Act
    const responses = await Promise.all(invalidPayloads.map((payload) => patchPricingConfig(superadminToken, payload)));

    // Assert
    for (const response of responses) {
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  test('changed pricing config affects newly created order grand total', async () => {
    // Arrange
    const buyerToken = await loginAs('demo', 'demo1234');
    const locationId = await createLocationForBuyer(buyerToken, 'Pricing Change Home');

    const baselineOrder = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: 'p-1', quantity: 1 }]
    });

    const updatedConfig = {
      deliveryFee: 8,
      serviceFeeRate: 0.2,
      taxRate: 0.15,
      discountRate: 0.04
    };

    const updatedConfigResponse = await patchPricingConfig(superadminToken, updatedConfig);

    // Act
    const repricedOrder = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: 'p-1', quantity: 1 }]
    });

    // Assert
    expect(baselineOrder.status).toBe(201);
    expect(updatedConfigResponse.status).toBe(200);
    expect(repricedOrder.status).toBe(201);

    const baselineExpected = roundMoney(
      Math.max(
        0,
        baselineOrder.body.data.subtotalAmount +
          DEFAULT_PRICING_CONFIG.deliveryFee +
          roundMoney(baselineOrder.body.data.subtotalAmount * DEFAULT_PRICING_CONFIG.serviceFeeRate) +
          roundMoney(baselineOrder.body.data.subtotalAmount * DEFAULT_PRICING_CONFIG.taxRate) -
          roundMoney(baselineOrder.body.data.subtotalAmount * DEFAULT_PRICING_CONFIG.discountRate)
      )
    );
    const repricedExpected = roundMoney(
      Math.max(
        0,
        repricedOrder.body.data.subtotalAmount +
          updatedConfig.deliveryFee +
          roundMoney(repricedOrder.body.data.subtotalAmount * updatedConfig.serviceFeeRate) +
          roundMoney(repricedOrder.body.data.subtotalAmount * updatedConfig.taxRate) -
          roundMoney(repricedOrder.body.data.subtotalAmount * updatedConfig.discountRate)
      )
    );

    expect(baselineOrder.body.data.grandTotal).toBe(baselineExpected);
    expect(repricedOrder.body.data.grandTotal).toBe(repricedExpected);
    expect(repricedOrder.body.data.grandTotal).not.toBe(baselineOrder.body.data.grandTotal);
    expect(repricedOrder.body.data.totalAmount).toBe(repricedOrder.body.data.grandTotal);
  });
});
