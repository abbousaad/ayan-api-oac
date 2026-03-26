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

const createOrderForBuyer = async ({ token, locationId, items, couponCode = null }) => {
  const response = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ locationId, deliveryMode: 'instant', items, couponCode });

  return response;
};

const roundMoney = (value) => Number(Number(value).toFixed(2));

const buildValidCouponPayload = (code) => {
  const startsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    code,
    discountType: 'fixed',
    discountValue: 2,
    startsAt,
    endsAt,
    isActive: true,
    maxUses: null
  };
};

describe('coupon security and integration behavior', () => {
  let superadminToken;
  let buyerToken;

  beforeEach(async () => {
    superadminToken = (await createAndLoginSuperadmin()).token;
    buyerToken = await loginAs('demo', 'demo1234');
  });

  test('superadmin is allowed to perform coupon CRUD endpoints', async () => {
    // Arrange
    const createPayload = buildValidCouponPayload('SEC-RBAC-ADMIN');

    // Act
    const listed = await request(app)
      .get('/api/v1/coupons')
      .set('Authorization', `Bearer ${superadminToken}`);

    const created = await request(app)
      .post('/api/v1/coupons')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send(createPayload);

    const patched = await request(app)
      .patch(`/api/v1/coupons/${created.body.data.id}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ isActive: false, maxUses: 10 });

    const deleted = await request(app)
      .delete(`/api/v1/coupons/${created.body.data.id}`)
      .set('Authorization', `Bearer ${superadminToken}`);

    // Assert
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.body.data)).toBe(true);
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe('SEC-RBAC-ADMIN');
    expect(patched.status).toBe(200);
    expect(patched.body.data.isActive).toBe(false);
    expect(patched.body.data.maxUses).toBe(10);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);
  });

  test('regular user is forbidden from coupon CRUD endpoints', async () => {
    // Arrange
    const createPayload = buildValidCouponPayload('SEC-RBAC-USER');

    // Act
    const listed = await request(app)
      .get('/api/v1/coupons')
      .set('Authorization', `Bearer ${buyerToken}`);

    const created = await request(app)
      .post('/api/v1/coupons')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send(createPayload);

    const patched = await request(app)
      .patch('/api/v1/coupons/cp-welcome10')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ isActive: false });

    const deleted = await request(app)
      .delete('/api/v1/coupons/cp-welcome10')
      .set('Authorization', `Bearer ${buyerToken}`);

    // Assert
    expect(listed.status).toBe(403);
    expect(listed.body.error.code).toBe('FORBIDDEN');
    expect(created.status).toBe(403);
    expect(created.body.error.code).toBe('FORBIDDEN');
    expect(patched.status).toBe(403);
    expect(patched.body.error.code).toBe('FORBIDDEN');
    expect(deleted.status).toBe(403);
    expect(deleted.body.error.code).toBe('FORBIDDEN');
  });

  test('coupon creation rejects invalid discountType', async () => {
    // Arrange
    const payload = {
      ...buildValidCouponPayload('SEC-INVALID-TYPE'),
      discountType: 'ratio'
    };

    // Act
    const response = await request(app)
      .post('/api/v1/coupons')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send(payload);

    // Assert
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('discountType');
  });

  test('coupon creation rejects invalid period', async () => {
    // Arrange
    const payload = {
      ...buildValidCouponPayload('SEC-INVALID-PERIOD'),
      startsAt: '2027-01-10T00:00:00.000Z',
      endsAt: '2027-01-01T00:00:00.000Z'
    };

    // Act
    const response = await request(app)
      .post('/api/v1/coupons')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send(payload);

    // Assert
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('Coupon period is invalid');
  });

  test('coupon creation rejects percentage greater than 1', async () => {
    // Arrange
    const payload = {
      ...buildValidCouponPayload('SEC-PERCENTAGE-OVER-ONE'),
      discountType: 'percentage',
      discountValue: 1.25
    };

    // Act
    const response = await request(app)
      .post('/api/v1/coupons')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send(payload);

    // Assert
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('between 0 and 1');
  });

  test('valid coupon applies and reduces order grand total and coupon discount amount', async () => {
    // Arrange
    const locationId = await createLocationForBuyer(buyerToken, 'Coupon Apply Home');
    const items = [{ productId: 'p-1', quantity: 2 }];

    // Act
    const baseline = await createOrderForBuyer({ token: buyerToken, locationId, items });
    const discounted = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items,
      couponCode: 'WELCOME10'
    });

    // Assert
    expect(baseline.status).toBe(201);
    expect(discounted.status).toBe(201);
    expect(discounted.body.data.couponCode).toBe('WELCOME10');
    const expectedCouponDiscount = roundMoney(discounted.body.data.subtotalAmount * 0.1);
    expect(discounted.body.data.couponDiscountAmount).toBe(expectedCouponDiscount);
    expect(discounted.body.data.grandTotal).toBeLessThan(baseline.body.data.grandTotal);
  });

  test('expired coupon is rejected with INVALID_COUPON', async () => {
    // Arrange
    const locationId = await createLocationForBuyer(buyerToken, 'Expired Coupon Home');

    // Act
    const response = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: 'p-1', quantity: 1 }],
      couponCode: 'EXPIRED5'
    });

    // Assert
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_COUPON');
  });

  test('unknown coupon is rejected with INVALID_COUPON', async () => {
    // Arrange
    const locationId = await createLocationForBuyer(buyerToken, 'Unknown Coupon Home');

    // Act
    const response = await createOrderForBuyer({
      token: buyerToken,
      locationId,
      items: [{ productId: 'p-1', quantity: 1 }],
      couponCode: 'NOT_REAL_COUPON'
    });

    // Assert
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_COUPON');
  });
});
