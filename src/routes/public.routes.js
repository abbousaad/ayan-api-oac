const express = require('express');
const { runQuery } = require('../db/pool');

const router = express.Router();

router.get('/public', (_req, res) => {
  res.status(200).json({ data: { message: 'Public route reachable' } });
});

router.get('/public/db-status', async (_req, res) => {
  try {
    const result = await runQuery('SELECT NOW() AS now');
    return res.status(200).json({
      data: {
        status: 'connected',
        now: result.rows[0].now
      }
    });
  } catch (_error) {
    return res.status(503).json({
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'Database connection is not available'
      }
    });
  }
});

module.exports = { publicRouter: router };
