const { DEFAULT_PRODUCT_IMAGE_URL } = require('../files/image-urls');

const PRODUCTS = [
  {
    id: 'p-1',
    storeId: 's-fruits',
    name: 'Olive Oil',
    description: 'Cold pressed olive oil',
    price: 8.99,
    stock: 120,
    unit: 'l',
    imageUrl: DEFAULT_PRODUCT_IMAGE_URL
  },
  {
    id: 'p-2',
    storeId: 's-vegets',
    name: 'Potato',
    description: 'Fresh local potatoes',
    price: 1.9,
    stock: 500,
    unit: 'kg',
    imageUrl: DEFAULT_PRODUCT_IMAGE_URL
  }
];

const getProductsStore = () => PRODUCTS;

module.exports = { getProductsStore };
