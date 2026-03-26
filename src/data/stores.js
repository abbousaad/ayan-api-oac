const STORES = [
  {
    id: 's-fruits',
    name: 'Fresh Fruits Store',
    category: 'fruits',
    slug: 'fruits-store'
  },
  {
    id: 's-vegets',
    name: 'Green Vegetables Store',
    category: 'vegets',
    slug: 'vegets-store'
  },
  {
    id: 's-ham',
    name: 'Ham Store',
    category: 'ham',
    slug: 'ham-store'
  },
  {
    id: 's-fish',
    name: 'Fish Store',
    category: 'fish',
    slug: 'fish-store'
  },
  {
    id: 's-ingrediant',
    name: 'Ingredients Store',
    category: 'ingrediant',
    slug: 'ingredients-store'
  }
];

const getStoresStore = () => STORES;

module.exports = { getStoresStore };
