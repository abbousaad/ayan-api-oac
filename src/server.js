const { app } = require('./app');
const { config } = require('./config/env');
const { waitForDatabase } = require('./db/wait-for-db');

const startServer = async () => {
  const dbState = await waitForDatabase();

  if (!dbState.ready) {
    throw new Error(`Database connection failed after ${dbState.attempts} attempts`);
  }

  app.listen(config.port, () => {
    if (config.nodeEnv !== 'test') {
      console.log(`API running on port ${config.port}`);
    }
  });
};

startServer().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
