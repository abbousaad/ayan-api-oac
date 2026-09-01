const { config } = require('../config/env');
const { runQuery } = require('../db/pool');
const { getTranslationConfigStore } = require('../data/translation-config');

const mapTranslationRow = (row) => ({
  defaultLocale: row.default_locale,
  activeLocales: row.active_locales,
  translations: row.translations
});

const getTranslationConfig = async () => {
  if (config.useInMemoryPersistence) {
    return getTranslationConfigStore();
  }

  const result = await runQuery(
    'SELECT default_locale, active_locales, translations FROM translation_config WHERE id = $1 LIMIT 1',
    ['default']
  );

  if (!result.rows[0]) {
    return getTranslationConfigStore();
  }

  return mapTranslationRow(result.rows[0]);
};

const updateTranslationConfig = async (changes) => {
  if (config.useInMemoryPersistence) {
    const state = getTranslationConfigStore();

    if (changes.defaultLocale !== undefined) {
      state.defaultLocale = changes.defaultLocale;
    }
    if (changes.activeLocales !== undefined) {
      state.activeLocales = changes.activeLocales;
    }
    if (changes.translations !== undefined) {
      // Shallow merge each locale's translations
      state.translations = {
        ...state.translations,
        ...Object.keys(changes.translations).reduce((acc, locale) => {
          acc[locale] = { ...state.translations[locale], ...changes.translations[locale] };
          return acc;
        }, {})
      };
    }

    return state;
  }

  const current = await getTranslationConfig();

  const nextDefaultLocale = changes.defaultLocale !== undefined ? changes.defaultLocale : current.defaultLocale;
  const nextActiveLocales = changes.activeLocales !== undefined ? changes.activeLocales : current.activeLocales;

  let nextTranslations = { ...current.translations };
  if (changes.translations !== undefined) {
    Object.keys(changes.translations).forEach((locale) => {
      nextTranslations[locale] = {
        ...nextTranslations[locale],
        ...changes.translations[locale]
      };
    });
  }

  const result = await runQuery(
    `UPDATE translation_config
     SET default_locale = $2,
         active_locales = $3,
         translations = $4,
         updated_at = NOW()
     WHERE id = $1
     RETURNING default_locale, active_locales, translations`,
    ['default', nextDefaultLocale, nextActiveLocales, JSON.stringify(nextTranslations)]
  );

  return result.rows[0] ? mapTranslationRow(result.rows[0]) : null;
};

module.exports = { getTranslationConfig, updateTranslationConfig };
