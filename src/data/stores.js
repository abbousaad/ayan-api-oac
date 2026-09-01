const { DEFAULT_STORE_IMAGE_URL } = require('../files/image-urls');

const STORES = [
  {
    id: 's-fruits',
    name: { en: 'Fresh Fruits Store', fr: 'Magasin de Fruits Frais', ar: 'متجر الفواكه الطازجة' },
    description: {
      en: 'Fresh seasonal fruits',
      fr: 'Fruits frais de saison',
      ar: 'فواكه طازجة موسمية'
    },
    category: 'fruits',
    slug: 'fruits-store',
    images: [DEFAULT_STORE_IMAGE_URL],
    imageUrl: DEFAULT_STORE_IMAGE_URL
  },
  {
    id: 's-vegets',
    name: { en: 'Green Vegetables Store', fr: 'Magasin de Légumes Verts', ar: 'متجر الخضروات الخضراء' },
    description: {
      en: 'Fresh green vegetables',
      fr: 'Légumes verts frais',
      ar: 'خضروات خضراء طازجة'
    },
    category: 'vegets',
    slug: 'vegets-store',
    images: [DEFAULT_STORE_IMAGE_URL],
    imageUrl: DEFAULT_STORE_IMAGE_URL
  },
  {
    id: 's-ham',
    name: { en: 'Ham Store', fr: 'Magasin de Jambon', ar: 'متجر اللحوم المقددة' },
    description: {
      en: 'Cured and sliced meats',
      fr: 'Viandes séchées et tranchées',
      ar: 'لحوم مقددة ومقطعة'
    },
    category: 'ham',
    slug: 'ham-store',
    images: [DEFAULT_STORE_IMAGE_URL],
    imageUrl: DEFAULT_STORE_IMAGE_URL
  },
  {
    id: 's-fish',
    name: { en: 'Fish Store', fr: 'Poissonnerie', ar: 'متجر الأسماك' },
    description: {
      en: 'Fresh catch of the day',
      fr: 'Pêche fraîche du jour',
      ar: 'صيد طازج يومي'
    },
    category: 'fish',
    slug: 'fish-store',
    images: [DEFAULT_STORE_IMAGE_URL],
    imageUrl: DEFAULT_STORE_IMAGE_URL
  },
  {
    id: 's-ingrediant',
    name: { en: 'Ingredients Store', fr: 'Magasin d\'Ingrédients', ar: 'متجر المكونات' },
    description: {
      en: 'Pantry staples and spices',
      fr: 'Produits de base et épices',
      ar: 'مواد غذائية أساسية وتوابل'
    },
    category: 'ingrediant',
    slug: 'ingredients-store',
    images: [DEFAULT_STORE_IMAGE_URL],
    imageUrl: DEFAULT_STORE_IMAGE_URL
  }
];

const getStoresStore = () => STORES;

module.exports = { getStoresStore };
