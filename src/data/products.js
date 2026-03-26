const PRODUCTS = [
  {
    id: 'p-1',
    storeId: 's-fruits',
    name: 'Olive Oil',
    description: 'Cold pressed olive oil',
    price: 8.99,
    stock: 120,
    unit: 'l'
  },
  {
    id: 'p-2',
    storeId: 's-vegets',
    name: 'Potato',
    description: 'Fresh local potatoes',
    price: 1.9,
    stock: 500,
    unit: 'kg'
  }
];

const getProductsStore = () => PRODUCTS;

module.exports = { getProductsStore };
