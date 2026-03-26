const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { config } = require('../config/env');
const { getUserById } = require('../repositories/users-repository');

const registerJwtStrategy = () => {
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.jwtSecret,
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
        algorithms: ['HS256']
      },
      async (payload, done) => {
        try {
          const user = await getUserById(payload.sub);
          if (!user) {
            return done(null, false);
          }

          return done(null, {
            id: user.id,
            username: user.username,
            role: user.role,
            mustChangePassword: Boolean(user.mustChangePassword)
          });
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};

module.exports = { passport, registerJwtStrategy };
