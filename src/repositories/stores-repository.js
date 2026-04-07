const { randomUUID } = require('crypto');
const { runQuery } = require('../db/pool');
const { config } = require('../config/env');
const { getStoresStore } = require('../data/stores');
const { DEFAULT_STORE_IMAGE_URL } = require('../files/image-urls');

const mapStoreRow = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  slug: row.slug,
  imageUrl: row.image_url
});

const getAllStores = async () => {
  if (config.useInMemoryPersistence) {
    return [...getStoresStore()];
  }

  const result = await runQuery('SELECT id, name, category, slug, image_url FROM stores ORDER BY created_at ASC');
  return result.rows.map(mapStoreRow);
};

const getStoreById = async (id) => {
  if (config.useInMemoryPersistence) {
    return getStoresStore().find((store) => store.id === id) || null;
  }

  const result = await runQuery('SELECT id, name, category, slug, image_url FROM stores WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] ? mapStoreRow(result.rows[0]) : null;
};

const createStore = async ({ name, category, slug, imageUrl = DEFAULT_STORE_IMAGE_URL }) => {
  const id = `s-${randomUUID()}`;

  if (config.useInMemoryPersistence) {
    const store = { id, name, category, slug, imageUrl };
    getStoresStore().push(store);
    return store;
  }

  const result = await runQuery(
    `INSERT INTO stores (id, name, category, slug, image_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, category, slug, image_url`,
    [id, name, category, slug, imageUrl]
  );

  return mapStoreRow(result.rows[0]);
};

const updateStore = async (id, changes) => {
  const existing = await getStoreById(id);
  if (!existing) {
    return null;
  }

  const next = { ...existing, ...changes };

  if (config.useInMemoryPersistence) {
    const stores = getStoresStore();
    const index = stores.findIndex((store) => store.id === id);
    stores[index] = next;
    return next;
  }

  const result = await runQuery(
    `UPDATE stores
     SET name = $2, category = $3, slug = $4, image_url = $5, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, category, slug, image_url`,
    [id, next.name, next.category, next.slug, next.imageUrl || DEFAULT_STORE_IMAGE_URL]
  );

  return result.rows[0] ? mapStoreRow(result.rows[0]) : null;
};

const deleteStore = async (id) => {
  if (config.useInMemoryPersistence) {
    const stores = getStoresStore();
    const index = stores.findIndex((store) => store.id === id);
    if (index === -1) {
      return false;
    }

    stores.splice(index, 1);
    return true;
  }

  const result = await runQuery('DELETE FROM stores WHERE id = $1', [id]);
  return result.rowCount > 0;
};

module.exports = {
  getAllStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore
};
