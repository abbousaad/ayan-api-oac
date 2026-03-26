const { config } = require('../config/env');
const { runQuery } = require('./pool');

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const waitForDatabase = async () => {
  let attempt = 0;

  while (attempt < config.dbConnectRetries) {
    attempt += 1;
    try {
      await runQuery('SELECT 1');
      return { ready: true, attempts: attempt };
    } catch (error) {
      if (attempt >= config.dbConnectRetries) {
        return { ready: false, attempts: attempt, error: error.message };
      }

      await sleep(config.dbConnectRetryDelayMs);
    }
  }

  return { ready: false, attempts: attempt, error: 'Database unavailable' };
};

module.exports = { waitForDatabase };
