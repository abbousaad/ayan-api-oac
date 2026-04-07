const { openapiSpec } = require('../../src/docs/openapi');

describe('openapi schema', () => {
  test('defines bearerAuth scheme', () => {
    expect(openapiSpec.components.securitySchemes.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    });
  });

  test('documents current commerce and order routes', () => {
    expect(openapiSpec.paths['/coupons']).toBeDefined();
    expect(openapiSpec.paths['/public/orders']).toBeDefined();
    expect(openapiSpec.paths['/settings/currency']).toBeDefined();
    expect(openapiSpec.paths['/me/locations']).toBeDefined();
    expect(openapiSpec.paths['/me/orders']).toBeDefined();
    expect(openapiSpec.paths['/orders']).toBeDefined();
    expect(openapiSpec.paths['/public-orders']).toBeDefined();
    expect(openapiSpec.paths['/orders/pricing-config']).toBeDefined();
    expect(openapiSpec.paths['/orders/{id}/confirm']).toBeDefined();
    expect(openapiSpec.paths['/orders/{id}/accept-delivery']).toBeDefined();
    expect(openapiSpec.paths['/orders/{id}/mark-paid']).toBeDefined();
    expect(openapiSpec.paths['/public-orders/{id}/confirm']).toBeDefined();
    expect(openapiSpec.paths['/public-orders/{id}/accept-delivery']).toBeDefined();
    expect(openapiSpec.paths['/public-orders/{id}/mark-paid']).toBeDefined();
    expect(openapiSpec.paths['/protected/users/{id}']).toBeDefined();
  });
});
