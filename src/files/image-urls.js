const FILES_BASE_URL = '/files';
const DEFAULT_STORE_IMAGE_URL = `${FILES_BASE_URL}/defaults/store-default.svg`;
const DEFAULT_PRODUCT_IMAGE_URL = `${FILES_BASE_URL}/defaults/product-default.svg`;

const getEntityImageUrl = ({ entityType, filename }) => `${FILES_BASE_URL}/uploads/${entityType}/${filename}`;

module.exports = {
  FILES_BASE_URL,
  DEFAULT_STORE_IMAGE_URL,
  DEFAULT_PRODUCT_IMAGE_URL,
  getEntityImageUrl
};
