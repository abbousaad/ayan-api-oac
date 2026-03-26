const createProductService = (productsRepository) => {
  const getAllProducts = (filters) => productsRepository.getAllProducts(filters);

  const getProductById = (id) => productsRepository.getProductById(id);

  const addProduct = (input) => productsRepository.addProduct(input);

  const editProduct = (id, changes) => productsRepository.editProduct(id, changes);

  const deleteProduct = (id) => productsRepository.deleteProduct(id);

  return {
    getAllProducts,
    getProductById,
    addProduct,
    editProduct,
    deleteProduct
  };
};

module.exports = { createProductService };
