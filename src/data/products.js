const { DEFAULT_PRODUCT_IMAGE_URL } = require('../files/image-urls');

const PRODUCTS = [
  {
    id: 'p-1',
    storeId: 's-fruits',
    name: { en: 'Olive Oil', fr: 'Huile d\'olive', ar: 'زيت الزيتون' },
    description: {
      en: 'Cold pressed olive oil',
      fr: 'Huile d\'olive pressée à froid',
      ar: 'زيت زيتون معصور على البارد'
    },
    price: 8.99,
    stock: 120,
    unit: 'l',
    images: [DEFAULT_PRODUCT_IMAGE_URL],
    imageUrl: DEFAULT_PRODUCT_IMAGE_URL
  },
  {
    id: 'p-2',
    storeId: 's-vegets',
    name: { en: 'Potato', fr: 'Pomme de terre', ar: 'بطاطس' },
    description: {
      en: 'Fresh local potatoes',
      fr: 'Pommes de terre locales fraîches',
      ar: 'بطاطس محلية طازجة'
    },
    price: 1.9,
    stock: 500,
    unit: 'kg',
    images: [DEFAULT_PRODUCT_IMAGE_URL],
    imageUrl: DEFAULT_PRODUCT_IMAGE_URL
  }
];

const getProductsStore = () => PRODUCTS;

module.exports = { getProductsStore };
