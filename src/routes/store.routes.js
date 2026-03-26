const express = require('express');
const { requireJwt, requireRole } = require('../auth/auth-middleware');
const storesRepository = require('../repositories/stores-repository');
const productsRepository = require('../repositories/products-repository');

const router = express.Router();
const ALLOWED_CATEGORIES = ['fruits', 'vegets', 'ham', 'fish', 'ingrediant'];

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
  return res.status(200).json({ data: products });
});

router.post('/stores', requireJwt, requireRole('superadmin'), async (req, res) => {
  const { name, category, slug } = req.body || {};
  if (!name || !category || !slug) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'name, category and slug are required' }
    });
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return res.status(422).json({
      error: { code: 'INVALID_CATEGORY', message: 'Unsupported category' }
    });
  }

  const store = await storesRepository.createStore({ name, category, slug });
  return res.status(201).json({ data: store });
});

router.patch('/stores/:id', requireJwt, requireRole('superadmin'), async (req, res) => {
  const changes = req.body || {};
  if (changes.category && !ALLOWED_CATEGORIES.includes(changes.category)) {
    return res.status(422).json({
      error: { code: 'INVALID_CATEGORY', message: 'Unsupported category' }
    });
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
