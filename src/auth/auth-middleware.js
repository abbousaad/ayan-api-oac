const { passport } = require('./passport');

const requireJwt = passport.authenticate('jwt', { session: false });

const requireRole = (role) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  if (req.user.role !== role) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
    });
  }

  if (req.user.role === 'superadmin' && req.user.mustChangePassword) {
    return res.status(403).json({
      error: {
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Superadmin must change default password before accessing this resource'
      }
    });
  }

  return next();
};

const requireAnyRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
    });
  }

  if (req.user.role === 'superadmin' && req.user.mustChangePassword) {
    return res.status(403).json({
      error: {
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Superadmin must change default password before accessing this resource'
      }
    });
  }

  return next();
};

module.exports = { requireJwt, requireRole, requireAnyRole };
