const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

const buildTokenPayload = (user) => ({
  sub: user.id,
  username: user.username,
  role: user.role
});

const signAccessToken = (user) => jwt.sign(buildTokenPayload(user), config.jwtSecret, {
  expiresIn: '15m',
  issuer: config.jwtIssuer,
  audience: config.jwtAudience,
  algorithm: 'HS256'
});

module.exports = { signAccessToken, buildTokenPayload };
