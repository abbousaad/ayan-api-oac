const { DEFAULT_STORE_IMAGE_URL } = require('../files/image-urls');

const STORES = [
  {
    id: 's-fruits',
    name: 'Fresh Fruits Store',
    category: 'fruits',
    slug: 'fruits-store',
    imageUrl: DEFAULT_STORE_IMAGE_URL
  },
  {
    id: 's-vegets',
    name: 'Green Vegetables Store',
    category: 'vegets',
    slug: 'vegets-store',
    imageUrl: DEFAULT_STORE_IMAGE_URL
  },
  {
    id: 's-ham',
    name: 'Ham Store',
    category: 'ham',
    slug: 'ham-store',
    imageUrl: DEFAULT_STORE_IMAGE_URL
  },
  {
    id: 's-fish',
    name: 'Fish Store',
    category: 'fish',
    slug: 'fish-store',
    imageUrl: DEFAULT_STORE_IMAGE_URL
  },
  {
    id: 's-ingrediant',
    name: 'Ingredients Store',
    category: 'ingrediant',
    slug: 'ingredients-store',
    imageUrl: DEFAULT_STORE_IMAGE_URL
  }
];

const getStoresStore = () => STORES;

module.exports = { getStoresStore };
