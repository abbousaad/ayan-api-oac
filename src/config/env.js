const dotenv = require('dotenv');

dotenv.config();

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  port: asNumber(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtIssuer: process.env.JWT_ISSUER || 'express-api-foundation',
  jwtAudience: process.env.JWT_AUDIENCE || 'express-api-clients',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://appuser:apppassword@localhost:5432/appdb',
  dbConnectRetries: asNumber(process.env.DB_CONNECT_RETRIES, 10),
  dbConnectRetryDelayMs: asNumber(process.env.DB_CONNECT_RETRY_DELAY_MS, 2000),
  trustProxy: process.env.TRUST_PROXY === 'true',
  useInMemoryPersistence: process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_PERSISTENCE === 'true'
};

module.exports = { config };
