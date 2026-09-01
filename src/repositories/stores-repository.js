const { randomUUID } = require('crypto');
const { runQuery } = require('../db/pool');
const { config } = require('../config/env');
const { getStoresStore } = require('../data/stores');
const { DEFAULT_STORE_IMAGE_URL } = require('../files/image-urls');

const mapStoreRow = (row, images = []) => ({
  id: row.id,
  name: { en: row.name_en, fr: row.name_fr || null, ar: row.name_ar || null },
  description: { en: row.description_en, fr: row.description_fr || null, ar: row.description_ar || null },
  category: row.category,
  slug: row.slug,
  images,
  imageUrl: images[0] || DEFAULT_STORE_IMAGE_URL
});

const getImagesByStoreIds = async (storeIds) => {
  if (storeIds.length === 0) {
    return {};
  }

  const result = await runQuery(
    'SELECT store_id, image_url FROM store_images WHERE store_id = ANY($1) ORDER BY store_id, sort_order ASC, created_at ASC',
    [storeIds]
  );

  return result.rows.reduce((acc, row) => {
    acc[row.store_id] = acc[row.store_id] || [];
    acc[row.store_id].push(row.image_url);
    return acc;
  }, {});
};

const getImagesForStore = async (storeId) => {
  const result = await runQuery(
    'SELECT image_url FROM store_images WHERE store_id = $1 ORDER BY sort_order ASC, created_at ASC',
    [storeId]
  );

  return result.rows.map((row) => row.image_url);
};

const replaceStoreImages = async (storeId, images = []) => {
  await runQuery('DELETE FROM store_images WHERE store_id = $1', [storeId]);

  if (images.length === 0) {
    return [];
  }

  const values = [];
  const placeholders = images.map((imageUrl, index) => {
    const base = index * 4;
    values.push(`si-${randomUUID()}`, storeId, imageUrl, index);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });

  await runQuery(
    `INSERT INTO store_images (id, store_id, image_url, sort_order) VALUES ${placeholders.join(', ')}`,
    values
  );

  return images;
};

const getAllStores = async () => {
  if (config.useInMemoryPersistence) {
    return [...getStoresStore()];
  }

  const result = await runQuery(
    'SELECT id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, category, slug FROM stores ORDER BY created_at ASC'
  );

  const imagesByStoreId = await getImagesByStoreIds(result.rows.map((row) => row.id));

  return result.rows.map((row) => mapStoreRow(row, imagesByStoreId[row.id] || []));
};

const getStoreById = async (id) => {
  if (config.useInMemoryPersistence) {
    return getStoresStore().find((store) => store.id === id) || null;
  }

  const result = await runQuery(
    'SELECT id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, category, slug FROM stores WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!result.rows[0]) {
    return null;
  }

  const images = await getImagesForStore(id);
  return mapStoreRow(result.rows[0], images);
};

const createStore = async ({
  nameEn,
  nameFr = null,
  nameAr = null,
  descriptionEn = '',
  descriptionFr = null,
  descriptionAr = null,
  category,
  slug,
  images = []
}) => {
  const id = `s-${randomUUID()}`;

  if (config.useInMemoryPersistence) {
    const store = {
      id,
      name: { en: nameEn, fr: nameFr, ar: nameAr },
      description: { en: descriptionEn, fr: descriptionFr, ar: descriptionAr },
      category,
      slug,
      images,
      imageUrl: images[0] || DEFAULT_STORE_IMAGE_URL
    };
    getStoresStore().push(store);
    return store;
  }

  const result = await runQuery(
    `INSERT INTO stores (id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, category, slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, category, slug`,
    [id, nameEn, nameFr, nameAr, descriptionEn, descriptionFr, descriptionAr, category, slug]
  );

  const savedImages = await replaceStoreImages(id, images);
  return mapStoreRow(result.rows[0], savedImages);
};

const updateStore = async (id, changes) => {
  const existing = await getStoreById(id);
  if (!existing) {
    return null;
  }

  const next = {
    id: existing.id,
    name: {
      en: changes.nameEn !== undefined ? changes.nameEn : existing.name.en,
      fr: changes.nameFr !== undefined ? changes.nameFr : existing.name.fr,
      ar: changes.nameAr !== undefined ? changes.nameAr : existing.name.ar
    },
    description: {
      en: changes.descriptionEn !== undefined ? changes.descriptionEn : existing.description.en,
      fr: changes.descriptionFr !== undefined ? changes.descriptionFr : existing.description.fr,
      ar: changes.descriptionAr !== undefined ? changes.descriptionAr : existing.description.ar
    },
    category: changes.category !== undefined ? changes.category : existing.category,
    slug: changes.slug !== undefined ? changes.slug : existing.slug,
    images: changes.images !== undefined ? changes.images : existing.images
  };
  next.imageUrl = next.images[0] || DEFAULT_STORE_IMAGE_URL;

  if (config.useInMemoryPersistence) {
    const stores = getStoresStore();
    const index = stores.findIndex((store) => store.id === id);
    stores[index] = next;
    return next;
  }

  const result = await runQuery(
    `UPDATE stores
     SET name_en = $2, name_fr = $3, name_ar = $4, description_en = $5, description_fr = $6, description_ar = $7, category = $8, slug = $9, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, category, slug`,
    [id, next.name.en, next.name.fr, next.name.ar, next.description.en, next.description.fr, next.description.ar, next.category, next.slug]
  );

  if (!result.rows[0]) {
    return null;
  }

  const images = changes.images !== undefined
    ? await replaceStoreImages(id, changes.images)
    : await getImagesForStore(id);

  return mapStoreRow(result.rows[0], images);
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
