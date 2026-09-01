const { config } = require('../config/env');
const { runQuery } = require('../db/pool');
const { getBrandingConfigStore } = require('../data/branding-config');

const mapBrandingRow = (row) => ({
  logoUrl: row.logo_url,
  title: row.title,
  subtitle: row.subtitle
});

const getBrandingConfig = async () => {
  if (config.useInMemoryPersistence) {
    return { ...getBrandingConfigStore() };
  }

  const result = await runQuery(
    'SELECT logo_url, title, subtitle FROM branding_config WHERE id = $1 LIMIT 1',
    ['default']
  );

  if (!result.rows[0]) {
    return { ...getBrandingConfigStore() };
  }

  return mapBrandingRow(result.rows[0]);
};

const updateBrandingConfig = async (changes) => {
  if (config.useInMemoryPersistence) {
    const state = getBrandingConfigStore();
    Object.assign(state, changes);
    return { ...state };
  }

  const current = await getBrandingConfig();
  const next = { ...current, ...changes };

  const result = await runQuery(
    `UPDATE branding_config
     SET logo_url = $2,
         title = $3,
         subtitle = $4,
         updated_at = NOW()
     WHERE id = $1
     RETURNING logo_url, title, subtitle`,
    ['default', next.logoUrl, next.title, next.subtitle]
  );

  return result.rows[0] ? mapBrandingRow(result.rows[0]) : null;
};

module.exports = { getBrandingConfig, updateBrandingConfig };
