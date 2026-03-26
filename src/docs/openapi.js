const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  failOnErrors: true,
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express API Foundation',
      version: '1.0.0',
      description: 'Starter API with JWT auth, Passport, logging, and tests'
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    paths: {
      '/public': {
        get: {
          summary: 'Public test route',
          responses: {
            200: {
              description: 'Public response'
            }
          }
        }
      },
      '/public/db-status': {
        get: {
          summary: 'Public database connectivity route',
          responses: {
            200: { description: 'Database reachable' },
            503: { description: 'Database unavailable' }
          }
        }
      },
      '/protected': {
        get: {
          summary: 'Protected test route',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Protected response'
            },
            401: {
              description: 'Unauthorized'
            }
          }
        }
      },
      '/auth/login': {
        post: {
          summary: 'Issue JWT for test user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Token issued' },
            401: { description: 'Invalid credentials' }
          }
        }
      },
      '/auth/register': {
        post: {
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'User created' },
            409: { description: 'Username exists' },
            422: { description: 'Weak password' }
          }
        }
      },
      '/auth/change-password': {
        patch: {
          summary: 'Change password for authenticated user',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword'],
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Password changed' },
            401: { description: 'Invalid current password' },
            422: { description: 'Weak password' }
          }
        }
      },
      '/products': {
        get: {
          summary: 'Get all products (public)',
          parameters: [
            {
              name: 'storeId',
              in: 'query',
              required: false,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Product list' }
          }
        },
        post: {
          summary: 'Create product (superadmin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            201: { description: 'Created' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' }
          }
        }
      },
      '/products/{id}': {
        get: {
          summary: 'Get product by id (public)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Single product' },
            404: { description: 'Not found' }
          }
        },
        patch: {
          summary: 'Edit product (superadmin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Updated' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' }
          }
        },
        delete: {
          summary: 'Delete product (superadmin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Deleted' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' }
          }
        }
      },
      '/stores': {
        get: {
          summary: 'Get all stores (public)',
          responses: {
            200: { description: 'Store list' }
          }
        },
        post: {
          summary: 'Create store (superadmin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            201: { description: 'Store created' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' }
          }
        }
      },
      '/stores/{id}': {
        get: {
          summary: 'Get store by id (public)',
          responses: {
            200: { description: 'Store details' },
            404: { description: 'Not found' }
          }
        },
        patch: {
          summary: 'Update store (superadmin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Store updated' },
            404: { description: 'Not found' }
          }
        },
        delete: {
          summary: 'Delete store (superadmin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Store deleted' },
            404: { description: 'Not found' }
          }
        }
      },
      '/stores/{id}/products': {
        get: {
          summary: 'Get products for one store (public)',
          responses: {
            200: { description: 'Store product list' },
            404: { description: 'Store not found' }
          }
        }
      }
    }
  },
  apis: []
};

const openapiSpec = swaggerJsdoc(options);

module.exports = { openapiSpec };
