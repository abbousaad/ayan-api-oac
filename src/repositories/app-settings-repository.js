const { runQuery } = require('../db/pool');
const { config } = require('../config/env');
const { getAppSettingsStore } = require('../data/app-settings');

const DEFAULT_CURRENCY_CODE = 'USD';

const mapCurrencyCode = (row) => row?.value || DEFAULT_CURRENCY_CODE;

const getCurrencyCode = async () => {
  if (config.useInMemoryPersistence) {
    return getAppSettingsStore().currencyCode || DEFAULT_CURRENCY_CODE;
  }

  const result = await runQuery(
    'SELECT value FROM app_settings WHERE key = $1 LIMIT 1',
    ['currency_code']
  );

  return mapCurrencyCode(result.rows[0]);
};

const updateCurrencyCode = async (currencyCode) => {
  if (config.useInMemoryPersistence) {
    const store = getAppSettingsStore();
    store.currencyCode = currencyCode;
    return store.currencyCode;
  }

  const result = await runQuery(
    `INSERT INTO app_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
     RETURNING value`,
    ['currency_code', currencyCode]
  );

  return mapCurrencyCode(result.rows[0]);
};

module.exports = { getCurrencyCode, updateCurrencyCode, DEFAULT_CURRENCY_CODE };
