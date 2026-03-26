const path = require('path');
const express = require('express');
const { requireJwt, requireRole } = require('../auth/auth-middleware');
const { openapiSpec } = require('../docs/openapi');
const { swaggerServe, swaggerSetup } = require('../docs/swagger');

const router = express.Router();

router.get('/docs-json', requireJwt, requireRole('superadmin'), (_req, res) => {
  res.status(200).json(openapiSpec);
});

router.get('/docs-auth.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '../docs/swagger-auth.client.js'));
});

router.use('/docs', swaggerServe, swaggerSetup);

module.exports = { docsRouter: router };
