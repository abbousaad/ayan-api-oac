const { httpLogger, redactSensitive } = require('../logging/logger');

const httpLoggerMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedInMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const payload = redactSensitive({
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(elapsedInMs.toFixed(2)),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      body: req.body,
      query: req.query
    });

    httpLogger.info('HTTP request', payload);
  });

  next();
};

module.exports = { httpLoggerMiddleware };
