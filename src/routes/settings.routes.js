const express = require('express');
const { requireJwt, requireRole } = require('../auth/auth-middleware');
const appSettingsRepository = require('../repositories/app-settings-repository');
const uiThemeConfigRepository = require('../repositories/ui-theme-config-repository');
const brandingConfigRepository = require('../repositories/branding-config-repository');
const { createImageUploadMiddleware, handleImageUpload, getUploadedImageUrl } = require('../uploads/image-upload');

const router = express.Router();
const uploadBrandingLogo = createImageUploadMiddleware('branding');

const isValidCurrencyCode = (value) => typeof value === 'string' && /^[A-Z]{3}$/.test(value);

const isValidHexColor = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);

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

router.get('/settings/theme', async (_req, res) => {
  const theme = await uiThemeConfigRepository.getThemeConfig();
  return res.status(200).json({ data: theme });
});

router.patch('/settings/theme', requireJwt, requireRole('superadmin'), async (req, res) => {
  const colorFields = [
    'primaryColor', 'textColor', 'secondaryColor', 'subtitle1Color', 'subtitle2Color',
    'logoTitleColor', 'logoSubtitleColor', 'mainButtonBgColor', 'secButtonBgColor',
    'homeSubtitleTextColor', 'homeTitleColor', 'accentColor', 'cardBgColor',
    'checkoutButtonBgColor', 'cartTitleColor', 'sectionTitleColor', 'bodyTextColor',
    'priceColor', 'pageBgColor', 'navBgColor'
  ];

  const updates = {};
  const invalidColors = [];

  colorFields.forEach((field) => {
    const value = req.body?.[field];
    if (value !== undefined) {
      if (!isValidHexColor(value)) {
        invalidColors.push(field);
      } else {
        updates[field] = value;
      }
    }
  });

  if (invalidColors.length > 0) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Invalid hex colors: ${invalidColors.join(', ')}. Use format #RRGGBB`,
        details: invalidColors
      }
    });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'At least one color field must be provided'
      }
    });
  }

  const updated = await uiThemeConfigRepository.updateThemeConfig(updates);
  return res.status(200).json({ data: updated });
});

router.get('/settings/branding', async (_req, res) => {
  const branding = await brandingConfigRepository.getBrandingConfig();
  return res.status(200).json({ data: branding });
});

router.patch('/settings/branding', requireJwt, requireRole('superadmin'), async (req, res) => {
  try {
    await handleImageUpload(uploadBrandingLogo)(req, res);
  } catch (uploadError) {
    return res.status(uploadError.status).json(uploadError.body);
  }

  const { title, subtitle } = req.body || {};
  const updates = {};
  const errors = [];

  console.log('BRANDING PATCH - Body:', { title, subtitle });
  console.log('BRANDING PATCH - File:', req.file ? `${req.file.filename}` : 'none');

  if (title !== undefined && title !== null && title !== '') {
    if (typeof title !== 'string') {
      errors.push('title must be a string');
    } else if (title.trim().length === 0) {
      errors.push('title cannot be empty');
    } else {
      updates.title = title.trim();
    }
  }

  if (subtitle !== undefined && subtitle !== null && subtitle !== '') {
    if (typeof subtitle !== 'string') {
      errors.push('subtitle must be a string');
    } else if (subtitle.trim().length === 0) {
      errors.push('subtitle cannot be empty');
    } else {
      updates.subtitle = subtitle.trim();
    }
  }

  if (req.file) {
    updates.logoUrl = getUploadedImageUrl('branding', req.file);
  }

  if (errors.length > 0) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: errors.join('; '),
        details: errors
      }
    });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'At least one field (title, subtitle, or logo image) must be provided'
      }
    });
  }

  const updated = await brandingConfigRepository.updateBrandingConfig(updates);
  return res.status(200).json({ data: updated });
});

module.exports = { settingsRouter: router };
