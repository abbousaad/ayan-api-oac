const helmet = require('helmet');
const { globalRateLimiter } = require('../config/rate-limit');

const applySecurityMiddleware = (app) => {
  app.use(helmet());
  app.use(globalRateLimiter);
};

module.exports = { applySecurityMiddleware };
