const { randomUUID } = require('crypto');
const { runQuery } = require('../db/pool');
const { getProductsStore } = require('../data/products');
const { config } = require('../config/env');
const { DEFAULT_PRODUCT_IMAGE_URL } = require('../files/image-urls');

const mapProductRow = (row) => ({
  id: row.id,
  storeId: row.store_id,
  name: row.name,
  description: row.description,
  price: Number(row.price),
  stock: Number(row.stock),
  unit: row.unit,
  imageUrl: row.image_url
});

const getAllProducts = async ({ storeId } = {}) => {
  if (config.useInMemoryPersistence) {
    const products = [...getProductsStore()];
    return storeId ? products.filter((product) => product.storeId === storeId) : products;
  }

  const query = storeId
    ? 'SELECT id, store_id, name, description, price, stock, unit, image_url FROM products WHERE store_id = $1 ORDER BY created_at ASC'
    : 'SELECT id, store_id, name, description, price, stock, unit, image_url FROM products ORDER BY created_at ASC';
  const params = storeId ? [storeId] : [];
  const result = await runQuery(query, params);

  return result.rows.map(mapProductRow);
};

const getProductById = async (id) => {
  if (config.useInMemoryPersistence) {
    return getProductsStore().find((product) => product.id === id) || null;
  }

  const result = await runQuery(
    'SELECT id, store_id, name, description, price, stock, unit, image_url FROM products WHERE id = $1 LIMIT 1',
    [id]
  );

  return result.rows[0] ? mapProductRow(result.rows[0]) : null;
};

const addProduct = async ({ storeId, name, description = '', price, stock, unit = 'unit', imageUrl = DEFAULT_PRODUCT_IMAGE_URL }) => {
  const id = `p-${randomUUID()}`;

  if (config.useInMemoryPersistence) {
    const product = {
      id,
      storeId,
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      unit,
      imageUrl
    };
    getProductsStore().push(product);
    return product;
  }

  const result = await runQuery(
    `INSERT INTO products (id, store_id, name, description, price, stock, unit, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, store_id, name, description, price, stock, unit, image_url`,
    [id, storeId, name, description, Number(price), Number(stock), unit, imageUrl]
  );

  return mapProductRow(result.rows[0]);
};

const editProduct = async (id, changes) => {
  const existing = await getProductById(id);
  if (!existing) {
    return null;
  }

  const next = {
     ...existing,
     ...changes,
      price: changes.price !== undefined ? Number(changes.price) : existing.price,
      stock: changes.stock !== undefined ? Number(changes.stock) : existing.stock,
      storeId: changes.storeId !== undefined ? changes.storeId : existing.storeId,
      unit: changes.unit !== undefined ? changes.unit : existing.unit
    };

  if (config.useInMemoryPersistence) {
    const store = getProductsStore();
    const index = store.findIndex((product) => product.id === id);
    store[index] = next;
    return next;
  }

  const result = await runQuery(
      `UPDATE products
      SET store_id = $2, name = $3, description = $4, price = $5, stock = $6, unit = $7, image_url = $8, updated_at = NOW()
      WHERE id = $1
      RETURNING id, store_id, name, description, price, stock, unit, image_url`,
    [id, next.storeId, next.name, next.description, next.price, next.stock, next.unit, next.imageUrl || DEFAULT_PRODUCT_IMAGE_URL]
  );

  return result.rows[0] ? mapProductRow(result.rows[0]) : null;
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
