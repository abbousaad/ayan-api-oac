const express = require('express');
const { openapiSpec } = require('../docs/openapi');
const { swaggerServe, swaggerSetup } = require('../docs/swagger');

const router = express.Router();
const swaggerContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https: data:",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "script-src-attr 'none'",
  "style-src 'self' https: 'unsafe-inline'",
  'upgrade-insecure-requests'
].join(';');

router.get('/docs-json', (_req, res) => {
  res.status(200).json(openapiSpec);
});

router.use('/docs', (_req, res, next) => {
  res.setHeader('Content-Security-Policy', swaggerContentSecurityPolicy);
  next();
});

router.use('/docs', swaggerServe, swaggerSetup);

module.exports = { docsRouter: router };
