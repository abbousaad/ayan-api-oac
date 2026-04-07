const express = require('express');
const { requireJwt, requireRole } = require('../auth/auth-middleware');
const { createProductService } = require('../services/product-service');
const productsRepository = require('../repositories/products-repository');
const storesRepository = require('../repositories/stores-repository');
const appSettingsRepository = require('../repositories/app-settings-repository');
const { createImageUploadMiddleware, handleImageUpload, getUploadedImageUrl } = require('../uploads/image-upload');

const router = express.Router();
const productService = createProductService(productsRepository);
const ALLOWED_UNITS = ['g', 'kg', 'ml', 'l', 'unit'];
const uploadProductImage = createImageUploadMiddleware('products');

router.get('/products', async (req, res) => {
  const products = await productService.getAllProducts({ storeId: req.query.storeId });
  const currencyCode = await appSettingsRepository.getCurrencyCode();
  const payload = products.map((product) => ({ ...product, currencyCode }));
  res.status(200).json({ data: payload });
});

router.get('/products/:id', async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  const currencyCode = await appSettingsRepository.getCurrencyCode();
  return res.status(200).json({ data: { ...product, currencyCode } });
});

router.post('/products', requireJwt, requireRole('superadmin'), async (req, res) => {
  try {
    await handleImageUpload(uploadProductImage)(req, res);
  } catch (uploadError) {
    return res.status(uploadError.status).json(uploadError.body);
  }

  const { storeId, name, price, stock, description, unit = 'unit' } = req.body || {};
  if (!storeId || !name || price === undefined || stock === undefined) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'storeId, name, price and stock are required' }
    });
  }

  const store = await storesRepository.getStoreById(storeId);
  if (!store) {
    return res.status(404).json({ error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
  }

  if (!ALLOWED_UNITS.includes(unit)) {
    return res.status(422).json({ error: { code: 'INVALID_UNIT', message: 'Unsupported unit' } });
  }

  const imageUrl = getUploadedImageUrl('products', req.file) || undefined;
  const product = await productService.addProduct({ storeId, name, price, stock, description, unit, imageUrl });
  const currencyCode = await appSettingsRepository.getCurrencyCode();
  return res.status(201).json({ data: { ...product, currencyCode } });
});

router.patch('/products/:id', requireJwt, requireRole('superadmin'), async (req, res) => {
  const changes = req.body || {};
  if (changes.unit && !ALLOWED_UNITS.includes(changes.unit)) {
    return res.status(422).json({ error: { code: 'INVALID_UNIT', message: 'Unsupported unit' } });
  }

  if (changes.storeId) {
    const store = await storesRepository.getStoreById(changes.storeId);
    if (!store) {
      return res.status(404).json({ error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
    }
  }

  const updated = await productService.editProduct(req.params.id, changes);
  if (!updated) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  const currencyCode = await appSettingsRepository.getCurrencyCode();
  return res.status(200).json({ data: { ...updated, currencyCode } });
});

router.delete('/products/:id', requireJwt, requireRole('superadmin'), async (req, res) => {
  const deleted = await productService.deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  return res.status(200).json({ data: { deleted: true } });
});

module.exports = { productRouter: router };
