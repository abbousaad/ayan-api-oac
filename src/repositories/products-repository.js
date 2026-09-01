const { randomUUID } = require('crypto');
const { runQuery } = require('../db/pool');
const { getProductsStore } = require('../data/products');
const { config } = require('../config/env');
const { DEFAULT_PRODUCT_IMAGE_URL } = require('../files/image-urls');

const mapProductRow = (row, images = []) => ({
  id: row.id,
  storeId: row.store_id,
  name: { en: row.name_en, fr: row.name_fr || null, ar: row.name_ar || null },
  description: { en: row.description_en, fr: row.description_fr || null, ar: row.description_ar || null },
  price: Number(row.price),
  stock: Number(row.stock),
  unit: row.unit,
  images,
  imageUrl: images[0] || DEFAULT_PRODUCT_IMAGE_URL
});

const getImagesByProductIds = async (productIds) => {
  if (productIds.length === 0) {
    return {};
  }

  const result = await runQuery(
    'SELECT product_id, image_url FROM product_images WHERE product_id = ANY($1) ORDER BY product_id, sort_order ASC, created_at ASC',
    [productIds]
  );

  return result.rows.reduce((acc, row) => {
    acc[row.product_id] = acc[row.product_id] || [];
    acc[row.product_id].push(row.image_url);
    return acc;
  }, {});
};

const getImagesForProduct = async (productId) => {
  const result = await runQuery(
    'SELECT image_url FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC, created_at ASC',
    [productId]
  );

  return result.rows.map((row) => row.image_url);
};

const replaceProductImages = async (productId, images = []) => {
  await runQuery('DELETE FROM product_images WHERE product_id = $1', [productId]);

  if (images.length === 0) {
    return [];
  }

  const values = [];
  const placeholders = images.map((imageUrl, index) => {
    const base = index * 4;
    values.push(`pi-${randomUUID()}`, productId, imageUrl, index);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });

  await runQuery(
    `INSERT INTO product_images (id, product_id, image_url, sort_order) VALUES ${placeholders.join(', ')}`,
    values
  );

  return images;
};

const getAllProducts = async ({ storeId } = {}) => {
  if (config.useInMemoryPersistence) {
    const products = [...getProductsStore()];
    return storeId ? products.filter((product) => product.storeId === storeId) : products;
  }

  const query = storeId
    ? 'SELECT id, store_id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, price, stock, unit FROM products WHERE store_id = $1 ORDER BY created_at ASC'
    : 'SELECT id, store_id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, price, stock, unit FROM products ORDER BY created_at ASC';
  const params = storeId ? [storeId] : [];
  const result = await runQuery(query, params);

  const imagesByProductId = await getImagesByProductIds(result.rows.map((row) => row.id));

  return result.rows.map((row) => mapProductRow(row, imagesByProductId[row.id] || []));
};

const getProductById = async (id) => {
  if (config.useInMemoryPersistence) {
    return getProductsStore().find((product) => product.id === id) || null;
  }

  const result = await runQuery(
    'SELECT id, store_id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, price, stock, unit FROM products WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!result.rows[0]) {
    return null;
  }

  const images = await getImagesForProduct(id);
  return mapProductRow(result.rows[0], images);
};

const addProduct = async ({
  storeId,
  nameEn,
  nameFr = null,
  nameAr = null,
  descriptionEn = '',
  descriptionFr = null,
  descriptionAr = null,
  price,
  stock,
  unit = 'unit',
  images = []
}) => {
  const id = `p-${randomUUID()}`;

  if (config.useInMemoryPersistence) {
    const product = {
      id,
      storeId,
      name: { en: nameEn, fr: nameFr, ar: nameAr },
      description: { en: descriptionEn, fr: descriptionFr, ar: descriptionAr },
      price: Number(price),
      stock: Number(stock),
      unit,
      images,
      imageUrl: images[0] || DEFAULT_PRODUCT_IMAGE_URL
    };
    getProductsStore().push(product);
    return product;
  }

  const result = await runQuery(
    `INSERT INTO products (id, store_id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, price, stock, unit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, store_id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, price, stock, unit`,
    [id, storeId, nameEn, nameFr, nameAr, descriptionEn, descriptionFr, descriptionAr, Number(price), Number(stock), unit]
  );

  const savedImages = await replaceProductImages(id, images);
  return mapProductRow(result.rows[0], savedImages);
};

const editProduct = async (id, changes) => {
  const existing = await getProductById(id);
  if (!existing) {
    return null;
  }

  const next = {
    id: existing.id,
    storeId: changes.storeId !== undefined ? changes.storeId : existing.storeId,
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
    price: changes.price !== undefined ? Number(changes.price) : existing.price,
    stock: changes.stock !== undefined ? Number(changes.stock) : existing.stock,
    unit: changes.unit !== undefined ? changes.unit : existing.unit,
    images: changes.images !== undefined ? changes.images : existing.images
  };
  next.imageUrl = next.images[0] || DEFAULT_PRODUCT_IMAGE_URL;

  if (config.useInMemoryPersistence) {
    const store = getProductsStore();
    const index = store.findIndex((product) => product.id === id);
    store[index] = next;
    return next;
  }

  const result = await runQuery(
    `UPDATE products
     SET store_id = $2, name_en = $3, name_fr = $4, name_ar = $5, description_en = $6, description_fr = $7, description_ar = $8, price = $9, stock = $10, unit = $11, updated_at = NOW()
     WHERE id = $1
     RETURNING id, store_id, name_en, name_fr, name_ar, description_en, description_fr, description_ar, price, stock, unit`,
    [id, next.storeId, next.name.en, next.name.fr, next.name.ar, next.description.en, next.description.fr, next.description.ar, next.price, next.stock, next.unit]
  );

  if (!result.rows[0]) {
    return null;
  }

  const images = changes.images !== undefined
    ? await replaceProductImages(id, changes.images)
    : await getImagesForProduct(id);

  return mapProductRow(result.rows[0], images);
};

const deleteProduct = async (id) => {
  if (config.useInMemoryPersistence) {
    const store = getProductsStore();
    const index = store.findIndex((product) => product.id === id);
    if (index === -1) {
      return false;
    }

    store.splice(index, 1);
    return true;
  }

  const result = await runQuery('DELETE FROM products WHERE id = $1', [id]);
  return result.rowCount > 0;
};

module.exports = {
  getAllProducts,
  getProductById,
  addProduct,
  editProduct,
  deleteProduct
};
