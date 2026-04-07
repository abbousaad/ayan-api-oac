const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  failOnErrors: true,
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express Market API',
      version: '1.0.0',
      description: 'API for authentication, catalog browsing, stores, coupons, locations, and order workflows.'
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'string' }
              },
              required: ['code', 'message']
            }
          },
          required: ['error']
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string', enum: ['user', 'superadmin', 'livreur'] },
            mustChangePassword: { type: 'boolean' }
          },
          required: ['id', 'username', 'role']
        },
        Store: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string', enum: ['fruits', 'vegets', 'ham', 'fish', 'ingrediant'] },
            slug: { type: 'string' },
            imageUrl: { type: 'string' }
          },
          required: ['id', 'name', 'category', 'slug', 'imageUrl']
        },
        CurrencySetting: {
          type: 'object',
          properties: {
            currencyCode: { type: 'string' }
          },
          required: ['currencyCode']
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            storeId: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            currencyCode: { type: 'string' },
            stock: { type: 'number' },
            description: { type: 'string', nullable: true },
            unit: { type: 'string', enum: ['g', 'kg', 'ml', 'l', 'unit'] },
            imageUrl: { type: 'string' }
          },
          required: ['id', 'storeId', 'name', 'price', 'currencyCode', 'stock', 'unit', 'imageUrl']
        },
        Coupon: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string' },
            discountType: { type: 'string', enum: ['fixed', 'percentage'] },
            discountValue: { type: 'number' },
            startsAt: { type: 'string', format: 'date-time' },
            endsAt: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' },
            maxUses: { type: 'integer', nullable: true },
            usedCount: { type: 'integer' }
          },
          required: ['id', 'code', 'discountType', 'discountValue', 'startsAt', 'endsAt', 'isActive']
        },
        Location: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            label: { type: 'string' },
            address: { type: 'string', nullable: true },
            latitude: { type: 'number', nullable: true },
            longitude: { type: 'number', nullable: true }
          },
          required: ['id', 'userId', 'label']
        },
        OrderItem: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            productName: { type: 'string' },
            unit: { type: 'string' },
            quantity: { type: 'number' },
            unitPrice: { type: 'number' },
            lineTotal: { type: 'number' }
          },
          required: ['productId', 'quantity']
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            locationId: { type: 'string' },
            deliveryMode: { type: 'string', enum: ['instant', 'scheduled'] },
            scheduledAt: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['pending', 'onpreparation', 'ondelivery', 'paid'] },
            couponId: { type: 'string', nullable: true },
            couponCode: { type: 'string', nullable: true },
            currencyCode: { type: 'string' },
            subtotal: { type: 'number' },
            deliveryFee: { type: 'number' },
            serviceFee: { type: 'number' },
            taxAmount: { type: 'number' },
            discountAmount: { type: 'number' },
            couponDiscountAmount: { type: 'number' },
            grandTotal: { type: 'number' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' }
            }
          },
          required: ['id', 'userId', 'locationId', 'deliveryMode', 'status', 'currencyCode']
        },
        GuestInfo: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', nullable: true },
            address: { type: 'string' }
          },
          required: ['name', 'phone', 'address']
        },
        PublicOrder: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            guestName: { type: 'string' },
            guestPhone: { type: 'string' },
            guestEmail: { type: 'string', nullable: true },
            guestAddress: { type: 'string' },
            deliveryMode: { type: 'string', enum: ['instant', 'scheduled'] },
            scheduledAt: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['pending', 'onpreparation', 'ondelivery', 'paid'] },
            couponId: { type: 'string', nullable: true },
            couponCode: { type: 'string', nullable: true },
            currencyCode: { type: 'string' },
            subtotalAmount: { type: 'number' },
            deliveryFee: { type: 'number' },
            serviceFee: { type: 'number' },
            taxAmount: { type: 'number' },
            discountAmount: { type: 'number' },
            couponDiscountAmount: { type: 'number' },
            grandTotal: { type: 'number' },
            totalAmount: { type: 'number' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' }
            }
          },
          required: ['id', 'guestName', 'guestPhone', 'guestAddress', 'deliveryMode', 'status', 'currencyCode']
        },
        PricingConfig: {
          type: 'object',
          properties: {
            deliveryFee: { type: 'number' },
            serviceFeeRate: { type: 'number' },
            taxRate: { type: 'number' },
            discountRate: { type: 'number' }
          },
          required: ['deliveryFee', 'serviceFeeRate', 'taxRate', 'discountRate']
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
      '/settings/currency': {
        get: {
          summary: 'Get global currency code (authenticated)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Currency setting', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/CurrencySetting' } } } } } },
            401: { description: 'Unauthorized' }
          }
        },
        patch: {
          summary: 'Update global currency code (superadmin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currencyCode'],
                  properties: {
                    currencyCode: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Currency setting updated', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/CurrencySetting' } } } } } },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            422: { description: 'Validation error' }
          }
        }
      },
      '/public/db-status': {
        get: {
          summary: 'Public database connectivity route',
          responses: {
            200: { description: 'Database reachable' },
            503: { description: 'Database unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/public/orders': {
        post: {
          summary: 'Create a guest order without authentication',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['guest', 'deliveryMode', 'items'],
                  properties: {
                    guest: { $ref: '#/components/schemas/GuestInfo' },
                    deliveryMode: { type: 'string', enum: ['instant', 'scheduled'] },
                    scheduledAt: { type: 'string', format: 'date-time' },
                    couponCode: { type: 'string' },
                    items: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        required: ['productId', 'quantity'],
                        properties: {
                          productId: { type: 'string' },
                          quantity: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Public order created', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/PublicOrder' } } } } } },
            400: { description: 'Validation error' },
            404: { description: 'Product not found' },
            422: { description: 'Invalid delivery, quantity, schedule, or coupon' }
          }
        }
      },
      '/protected': {
        get: {
          summary: 'Protected test route',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Protected response' },
            401: { description: 'Unauthorized' }
          }
        }
      },
      '/protected/users/{id}': {
        get: {
          summary: 'Get the authenticated user profile by id',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'User profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/auth/login': {
        post: {
          summary: 'Issue JWT for a user',
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
            200: {
              description: 'Token issued',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' },
                          user: { $ref: '#/components/schemas/User' }
                        },
                        required: ['token', 'user']
                      }
                    }
                  }
                }
              }
            },
            400: { description: 'Validation error' },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
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
            400: { description: 'Validation error' },
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
            400: { description: 'Validation error' },
            401: { description: 'Invalid current password' },
            422: { description: 'Weak password' }
          }
        }
      },
      '/products': {
        get: {
          summary: 'Get all products',
          parameters: [
            {
              name: 'storeId',
              in: 'query',
              required: false,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'Product list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Product' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create product (superadmin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['storeId', 'name', 'price', 'stock'],
                  properties: {
                    storeId: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    stock: { type: 'number' },
                    description: { type: 'string' },
                    unit: { type: 'string', enum: ['g', 'kg', 'ml', 'l', 'unit'], default: 'unit' },
                    image: { type: 'string', format: 'binary' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Created' },
            400: { description: 'Validation error' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Store not found' },
            422: { description: 'Invalid unit' }
          }
        }
      },
      '/products/{id}': {
        get: {
          summary: 'Get product by id',
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
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    storeId: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    stock: { type: 'number' },
                    description: { type: 'string' },
                    unit: { type: 'string', enum: ['g', 'kg', 'ml', 'l', 'unit'] }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Updated' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Product or store not found' },
            422: { description: 'Invalid unit' }
          }
        },
        delete: {
          summary: 'Delete product (superadmin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
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
          summary: 'Get all stores',
          responses: {
            200: { description: 'Store list' }
          }
        },
        post: {
          summary: 'Create store (superadmin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['name', 'category', 'slug'],
                  properties: {
                    name: { type: 'string' },
                    category: { type: 'string', enum: ['fruits', 'vegets', 'ham', 'fish', 'ingrediant'] },
                    slug: { type: 'string' },
                    image: { type: 'string', format: 'binary' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Store created' },
            400: { description: 'Validation error' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            422: { description: 'Invalid category' }
          }
        }
      },
      '/stores/{id}': {
        get: {
          summary: 'Get store by id',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Store details' },
            404: { description: 'Not found' }
          }
        },
        patch: {
          summary: 'Update store (superadmin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    category: { type: 'string', enum: ['fruits', 'vegets', 'ham', 'fish', 'ingrediant'] },
                    slug: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Store updated' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
            422: { description: 'Invalid category' }
          }
        },
        delete: {
          summary: 'Delete store (superadmin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Store deleted' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' }
          }
        }
      },
      '/stores/{id}/products': {
        get: {
          summary: 'Get products for one store',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Store product list' },
            404: { description: 'Store not found' }
          }
        }
      },
      '/coupons': {
        get: {
          summary: 'List coupons (superadmin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Coupon list' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' }
          }
        },
        post: {
          summary: 'Create coupon (superadmin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code', 'discountType', 'discountValue', 'startsAt', 'endsAt'],
                  properties: {
                    code: { type: 'string' },
                    discountType: { type: 'string', enum: ['fixed', 'percentage'] },
                    discountValue: { type: 'number' },
                    startsAt: { type: 'string', format: 'date-time' },
                    endsAt: { type: 'string', format: 'date-time' },
                    isActive: { type: 'boolean' },
                    maxUses: { type: 'integer', nullable: true }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Coupon created' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            409: { description: 'Coupon exists' },
            422: { description: 'Validation error' }
          }
        }
      },
      '/coupons/{id}': {
        patch: {
          summary: 'Update coupon (superadmin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    discountType: { type: 'string', enum: ['fixed', 'percentage'] },
                    discountValue: { type: 'number' },
                    startsAt: { type: 'string', format: 'date-time' },
                    endsAt: { type: 'string', format: 'date-time' },
                    isActive: { type: 'boolean' },
                    maxUses: { type: 'integer', nullable: true }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Coupon updated' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Coupon not found' },
            422: { description: 'Validation error' }
          }
        },
        delete: {
          summary: 'Delete coupon (superadmin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Coupon deleted' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Coupon not found' }
          }
        }
      },
      '/me/locations': {
        get: {
          summary: 'List locations for the authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Location list' },
            401: { description: 'Unauthorized' }
          }
        },
        post: {
          summary: 'Create a saved location for the authenticated user',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['label'],
                  properties: {
                    label: { type: 'string' },
                    address: { type: 'string' },
                    latitude: { type: 'number' },
                    longitude: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Location created' },
            400: { description: 'Validation error' },
            401: { description: 'Unauthorized' }
          }
        }
      },
      '/me/orders': {
        get: {
          summary: 'List orders for the authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Order list' },
            401: { description: 'Unauthorized' }
          }
        }
      },
      '/orders': {
        post: {
          summary: 'Create an order',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['locationId', 'deliveryMode', 'items'],
                  properties: {
                    locationId: { type: 'string' },
                    deliveryMode: { type: 'string', enum: ['instant', 'scheduled'] },
                    scheduledAt: { type: 'string', format: 'date-time' },
                    couponCode: { type: 'string' },
                    items: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        required: ['productId', 'quantity'],
                        properties: {
                          productId: { type: 'string' },
                          quantity: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Order created' },
            400: { description: 'Validation error' },
            401: { description: 'Unauthorized' },
            404: { description: 'Location or product not found' },
            422: { description: 'Invalid delivery, quantity, schedule, or coupon' }
          }
        }
      },
      '/public-orders': {
        get: {
          summary: 'List public orders (superadmin, livreur)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['pending', 'onpreparation', 'ondelivery', 'paid'] }
            }
          ],
          responses: {
            200: { description: 'Public order list' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            422: { description: 'Validation error' }
          }
        }
      },
      '/orders/pricing-config': {
        get: {
          summary: 'Get order pricing configuration (superadmin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Pricing config' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' }
          }
        },
        patch: {
          summary: 'Update order pricing configuration (superadmin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deliveryFee: { type: 'number' },
                    serviceFeeRate: { type: 'number' },
                    taxRate: { type: 'number' },
                    discountRate: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Pricing config updated' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            422: { description: 'Validation error' }
          }
        }
      },
      '/orders/{id}/confirm': {
        patch: {
          summary: 'Move order to onpreparation (superadmin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Order confirmed' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Order not found' },
            409: { description: 'Invalid status transition' }
          }
        }
      },
      '/public-orders/{id}/confirm': {
        patch: {
          summary: 'Move public order to onpreparation (superadmin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Public order confirmed' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Public order not found' },
            409: { description: 'Invalid status transition' }
          }
        }
      },
      '/orders/{id}/accept-delivery': {
        patch: {
          summary: 'Move order to ondelivery (livreur only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Order accepted for delivery' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Order not found' },
            409: { description: 'Invalid status transition' }
          }
        }
      },
      '/public-orders/{id}/accept-delivery': {
        patch: {
          summary: 'Move public order to ondelivery (livreur only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Public order accepted for delivery' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Public order not found' },
            409: { description: 'Invalid status transition' }
          }
        }
      },
      '/orders/{id}/mark-paid': {
        patch: {
          summary: 'Move order to paid (livreur only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Order marked as paid' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Order not found' },
            409: { description: 'Invalid status transition' }
          }
        }
      },
      '/public-orders/{id}/mark-paid': {
        patch: {
          summary: 'Move public order to paid (livreur only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Public order marked as paid' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Public order not found' },
            409: { description: 'Invalid status transition' }
          }
        }
      }
    }
  },
  apis: []
};

const openapiSpec = swaggerJsdoc(options);

module.exports = { openapiSpec };
