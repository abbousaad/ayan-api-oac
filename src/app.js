const express = require('express');
const cors = require('cors');
const { httpLoggerMiddleware } = require('./middleware/http-logger');
const { errorLogger } = require('./logging/logger');
const { passport, registerJwtStrategy } = require('./auth/passport');
const { authRouter } = require('./routes/auth.routes');
const { apiRouter } = require('./routes');
const { applySecurityMiddleware } = require('./middleware/security');
const { docsRouter } = require('./routes/docs.routes');
const { config } = require('./config/env');

const app = express();
app.set('trust proxy', config.trustProxy);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(httpLoggerMiddleware);
applySecurityMiddleware(app);

registerJwtStrategy();
app.use(passport.initialize());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1', apiRouter);
app.use('/api/v1', docsRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ data: { status: 'ok' } });
});

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use((error, _req, res, _next) => {
  errorLogger.info('Unhandled error', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  });
});

module.exports = { app };
