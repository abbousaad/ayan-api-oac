const express = require('express');
const { requireJwt } = require('../auth/auth-middleware');
const { securityLogger } = require('../logging/logger');

const router = express.Router();

router.get('/protected', requireJwt, (req, res) => {
  res.status(200).json({
    data: {
      message: 'Protected route reachable',
      user: req.user
    }
  });
});

router.get('/protected/users/:id', requireJwt, (req, res) => {
  if (req.user.id !== req.params.id) {
    securityLogger.info('Potential IDOR attempt detected', {
      actorId: req.user.id,
      requestedResourceId: req.params.id,
      route: req.originalUrl,
      ip: req.ip
    });

    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'You cannot access this resource' }
    });
  }

  return res.status(200).json({
    data: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

module.exports = { protectedRouter: router };
