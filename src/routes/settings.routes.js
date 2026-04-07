const express = require('express');
const { requireJwt, requireRole } = require('../auth/auth-middleware');
const appSettingsRepository = require('../repositories/app-settings-repository');

const router = express.Router();

const isValidCurrencyCode = (value) => typeof value === 'string' && /^[A-Z]{3}$/.test(value);

router.get('/settings/currency', requireJwt, async (_req, res) => {
  const currencyCode = await appSettingsRepository.getCurrencyCode();
  return res.status(200).json({ data: { currencyCode } });
});

router.patch('/settings/currency', requireJwt, requireRole('superadmin'), async (req, res) => {
  const { currencyCode } = req.body || {};
  if (!isValidCurrencyCode(currencyCode)) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'currencyCode must be a 3-letter ISO code' }
    });
  }

  const updated = await appSettingsRepository.updateCurrencyCode(currencyCode);
  return res.status(200).json({ data: { currencyCode: updated } });
});

module.exports = { settingsRouter: router };
