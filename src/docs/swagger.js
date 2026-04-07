const swaggerUi = require('swagger-ui-express');

const swaggerServe = swaggerUi.serve;
const swaggerSetup = swaggerUi.setup(null, {
  customSiteTitle: 'Express API Foundation Docs',
  swaggerOptions: {
    url: '/api/v1/docs-json',
    persistAuthorization: true
  }
});

module.exports = { swaggerServe, swaggerSetup };
