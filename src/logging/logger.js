const { createLogger, format, transports } = require('winston');
const { buildFileTransport } = require('./transports');

const SENSITIVE_FIELDS = ['password', 'token', 'authorization', 'apiKey', 'secret'];

const redactSensitive = (value) => {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((result, [key, nestedValue]) => {
      const normalized = key.toLowerCase();
      result[key] = SENSITIVE_FIELDS.includes(normalized) ? '[REDACTED]' : redactSensitive(nestedValue);
      return result;
    }, {});
  }

  return value;
};

const baseFormat = format.combine(format.timestamp(), format.json());

const createChannelLogger = (folder, fileName) => {
  const loggerTransports = [buildFileTransport(folder, fileName, 'info')];

  if (process.env.NODE_ENV !== 'production') {
    loggerTransports.push(new transports.Console({ level: 'info' }));
  }

  return createLogger({
    level: 'info',
    format: baseFormat,
    transports: loggerTransports
  });
};

const httpLogger = createChannelLogger('http', 'http.log');
const errorLogger = createChannelLogger('errors', 'errors.log');
const securityLogger = createChannelLogger('security', 'security.log');

module.exports = {
  httpLogger,
  errorLogger,
  securityLogger,
  redactSensitive
};
