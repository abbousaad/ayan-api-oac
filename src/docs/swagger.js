const swaggerUi = require('swagger-ui-express');

const swaggerServe = swaggerUi.serve;
const swaggerSetup = swaggerUi.setup(null, {
  customSiteTitle: 'Express API Foundation Docs',
  customJs: '/api/v1/docs-auth.js',
  swaggerOptions: {
    url: '/api/v1/docs-json',
    persistAuthorization: true,
    requestInterceptor: (request) => {
      const token = window.localStorage.getItem('swaggerBearerToken');

      if (token) {
        request.headers = request.headers || {};
        request.headers.Authorization = `Bearer ${token}`;
      }

      return request;
    }
  }
});

module.exports = { swaggerServe, swaggerSetup };
