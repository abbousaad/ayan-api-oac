const express = require('express');
const { signAccessToken } = require('../auth/jwt');
const {
  getUserByUsername,
  createUser,
  updateUserPasswordHash
} = require('../repositories/users-repository');
const { requireJwt } = require('../auth/auth-middleware');
const { securityLogger, redactSensitive } = require('../logging/logger');
const { createAttemptTracker, authenticateCredentials } = require('../services/auth-service');
const { authRateLimiter } = require('../config/rate-limit');
const { verifyPassword, hashPassword } = require('../security/password');

const router = express.Router();
const attemptTracker = createAttemptTracker(4);

router.post('/register', authRateLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'role')) {
    securityLogger.error('CRITICAL_SECURITY_EVENT: Register role override attempt', redactSensitive({
      username,
      ip: req.ip,
      attemptedRole: req.body.role,
      payload: req.body
    }));
  }

  if (!username || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' }
    });
  }

  if (String(password).length < 8) {
    return res.status(422).json({
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' }
    });
  }

  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    return res.status(409).json({
      error: { code: 'USERNAME_EXISTS', message: 'Username is already in use' }
    });
  }

  try {
    const passwordHash = await hashPassword(password);
    const createdUser = await createUser({ username, passwordHash, role: 'user' });

    return res.status(201).json({
      data: {
        id: createdUser.id,
        username: createdUser.username,
        role: createdUser.role
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: { code: 'USERNAME_EXISTS', message: 'Username is already in use' }
      });
    }

    throw error;
  }
});

router.post('/login', authRateLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' }
    });
  }

  const result = await authenticateCredentials(getUserByUsername, verifyPassword, { username, password });
  const attemptKey = `${username}:${req.ip}`;

  if (!result.success) {
    const attempt = attemptTracker.registerFailure(attemptKey);

    if (attempt.exceeded) {
      securityLogger.info('Repeated authentication failures detected', redactSensitive({
        username,
        ip: req.ip,
        failedAttempts: attempt.count,
        password
      }));
    }

    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
    });
  }

  attemptTracker.clearFailures(attemptKey);
  const token = signAccessToken(result.user);

  return res.status(200).json({
    data: {
      token,
      user: result.user
    }
  });
});

router.patch('/change-password', authRateLimiter, requireJwt, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'currentPassword and newPassword are required' }
    });
  }

  if (String(newPassword).length < 8) {
    return res.status(422).json({
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' }
    });
  }

  const user = await getUserByUsername(req.user.username);
  const validCurrentPassword = user
    ? await verifyPassword(currentPassword, user.passwordHash)
    : false;

  if (!validCurrentPassword) {
    securityLogger.info('Invalid change-password attempt', redactSensitive({
      username: req.user.username,
      ip: req.ip,
      currentPassword
    }));

    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Current password is invalid' }
    });
  }

  const passwordHash = await hashPassword(newPassword);
  await updateUserPasswordHash({ userId: req.user.id, passwordHash });

  securityLogger.info('Password changed successfully', {
    username: req.user.username,
    userId: req.user.id,
    ip: req.ip
  });

  return res.status(200).json({
    data: { updated: true }
  });
});

module.exports = { authRouter: router };
