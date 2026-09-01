const express = require('express');
const { requireJwt, requireRole } = require('../auth/auth-middleware');
const storesRepository = require('../repositories/stores-repository');
const productsRepository = require('../repositories/products-repository');
const appSettingsRepository = require('../repositories/app-settings-repository');
const { createMultiImageUploadMiddleware, handleImageUpload, getUploadedImageUrls } = require('../uploads/image-upload');

const router = express.Router();
const MAX_STORE_IMAGES = 6;
const uploadStoreImages = createMultiImageUploadMiddleware('stores', MAX_STORE_IMAGES);

router.get('/stores', async (_req, res) => {
  const stores = await storesRepository.getAllStores();
  return res.status(200).json({ data: stores });
});

router.get('/stores/:id', async (req, res) => {
  const store = await storesRepository.getStoreById(req.params.id);
  if (!store) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Store not found' } });
  }

  return res.status(200).json({ data: store });
});

router.get('/stores/:id/products', async (req, res) => {
  const store = await storesRepository.getStoreById(req.params.id);
  if (!store) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Store not found' } });
  }

  const products = await productsRepository.getAllProducts({ storeId: req.params.id });
  const currencyCode = await appSettingsRepository.getCurrencyCode();
  const payload = products.map((product) => ({ ...product, currencyCode }));
  return res.status(200).json({ data: payload });
});

router.post('/stores', requireJwt, requireRole('superadmin'), async (req, res) => {
  try {
    await handleImageUpload(uploadStoreImages)(req, res);
  } catch (uploadError) {
    return res.status(uploadError.status).json(uploadError.body);
  }

  const { nameEn, nameFr, nameAr, category, slug, descriptionEn, descriptionFr, descriptionAr } = req.body || {};
  if (!nameEn || !category || !slug) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'nameEn, category and slug are required' }
    });
  }

  const images = getUploadedImageUrls('stores', req.files);
  const store = await storesRepository.createStore({
    nameEn,
    nameFr,
    nameAr,
    category,
    slug,
    descriptionEn,
    descriptionFr,
    descriptionAr,
    images
  });
  return res.status(201).json({ data: store });
});

router.patch('/stores/:id', requireJwt, requireRole('superadmin'), async (req, res) => {
  try {
    await handleImageUpload(uploadStoreImages)(req, res);
  } catch (uploadError) {
    return res.status(uploadError.status).json(uploadError.body);
  }

  const changes = req.body || {};

  if (req.files && req.files.length > 0) {
    changes.images = getUploadedImageUrls('stores', req.files);
  }

  const updated = await storesRepository.updateStore(req.params.id, changes);
  if (!updated) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Store not found' } });
  }

  return res.status(200).json({ data: updated });
});

router.delete('/stores/:id', requireJwt, requireRole('superadmin'), async (req, res) => {
  const deleted = await storesRepository.deleteStore(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Store not found' } });
  }

  return res.status(200).json({ data: { deleted: true } });
});

module.exports = { storeRouter: router };
