const { openapiSpec } = require('../../src/docs/openapi');

describe('openapi schema', () => {
  test('defines bearerAuth scheme', () => {
    expect(openapiSpec.components.securitySchemes.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    });
  });
});
