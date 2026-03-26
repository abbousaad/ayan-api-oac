const rateLimit = require('express-rate-limit');
const { securityLogger } = require('../logging/logger');

const getClientAddress = (req) => req.socket?.remoteAddress || req.ip || 'unknown';

const createRateLimiter = ({ windowMs, max, label }) => rateLimit({
  windowMs,
  max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `${label}:${getClientAddress(req)}`,
  handler: (req, res) => {
    securityLogger.info('Rate limit threshold exceeded', {
      label,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please retry later' }
    });
  }
});

const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  label: 'global'
});

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  label: 'auth'
});

module.exports = { globalRateLimiter, authRateLimiter };
