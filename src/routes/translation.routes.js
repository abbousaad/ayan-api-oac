const express = require('express');
const { requireJwt, requireRole } = require('../auth/auth-middleware');
const translationConfigRepository = require('../repositories/translation-config-repository');

const router = express.Router();

const VALID_LOCALES = ['en', 'fr', 'ar'];

const isValidLocale = (locale) => VALID_LOCALES.includes(locale);

const isValidTranslations = (translations) => {
  if (typeof translations !== 'object' || translations === null) {
    return false;
  }

  for (const locale in translations) {
    if (!isValidLocale(locale)) {
      return false;
    }
    if (typeof translations[locale] !== 'object' || translations[locale] === null || Array.isArray(translations[locale])) {
      return false;
    }
    for (const key in translations[locale]) {
      if (typeof translations[locale][key] !== 'string') {
        return false;
      }
    }
  }

  return true;
};

router.get('/settings/translations', async (_req, res) => {
  const config = await translationConfigRepository.getTranslationConfig();
  return res.status(200).json({ data: config });
});

router.patch('/settings/translations', requireJwt, requireRole('superadmin'), async (req, res) => {
  const { defaultLocale, activeLocales, translations } = req.body || {};
  const errors = [];

  // Validate defaultLocale if provided
  if (defaultLocale !== undefined) {
    if (!isValidLocale(defaultLocale)) {
      errors.push('defaultLocale must be one of: en, fr, ar');
    }
  }

  // Validate activeLocales if provided
  if (activeLocales !== undefined) {
    if (!Array.isArray(activeLocales) || activeLocales.length === 0) {
      errors.push('activeLocales must be a non-empty array');
    } else if (!activeLocales.every((locale) => isValidLocale(locale))) {
      errors.push('activeLocales contains invalid locale codes. Valid: en, fr, ar');
    }
  }

  // Validate translations if provided
  if (translations !== undefined) {
    if (!isValidTranslations(translations)) {
      errors.push('translations must be an object with locale keys, each containing string values');
    }
  }

  if (errors.length > 0) {
    return res.status(422).json({
      error: {
        code: 'TRANSLATION_VALIDATION_FAILED',
        message: 'Translation config validation failed',
        details: errors.join('; ')
      }
    });
  }

  // After update, validate that defaultLocale is in activeLocales
  const current = await translationConfigRepository.getTranslationConfig();
  const nextDefaultLocale = defaultLocale !== undefined ? defaultLocale : current.defaultLocale;
  const nextActiveLocales = activeLocales !== undefined ? activeLocales : current.activeLocales;

  if (!nextActiveLocales.includes(nextDefaultLocale)) {
    return res.status(422).json({
      error: {
        code: 'TRANSLATION_VALIDATION_FAILED',
        message: 'defaultLocale must be included in activeLocales',
        details: `defaultLocale '${nextDefaultLocale}' not in activeLocales: [${nextActiveLocales.join(', ')}]`
      }
    });
  }

  const updates = {};
  if (defaultLocale !== undefined) updates.defaultLocale = defaultLocale;
  if (activeLocales !== undefined) updates.activeLocales = activeLocales;
  if (translations !== undefined) updates.translations = translations;

  if (Object.keys(updates).length === 0) {
    return res.status(422).json({
      error: {
        code: 'TRANSLATION_VALIDATION_FAILED',
        message: 'At least one field must be provided'
      }
    });
  }

  const updated = await translationConfigRepository.updateTranslationConfig(updates);
  return res.status(200).json({ data: updated });
});

module.exports = { translationRouter: router };
