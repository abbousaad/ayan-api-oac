const { createProductService } = require('../../src/services/product-service');

describe('product service', () => {
  test('getAllProducts returns products', async () => {
    const repo = { getAllProducts: jest.fn().mockResolvedValue([{ id: 'p-1', name: 'A', price: 1, stock: 1 }]) };
    const service = createProductService(repo);
    const result = await service.getAllProducts();
    expect(result).toHaveLength(1);
  });

  test('getProductById returns matching product', async () => {
    const repo = { getProductById: jest.fn().mockResolvedValue({ id: 'p-1', name: 'A', price: 1, stock: 1 }) };
    const service = createProductService(repo);
    const result = await service.getProductById('p-1');
    expect(result).toEqual({ id: 'p-1', name: 'A', price: 1, stock: 1 });
  });

  test('addProduct adds an item', async () => {
    const repo = { addProduct: jest.fn().mockResolvedValue({ id: 'p-3', name: 'A', price: 12, stock: 2 }) };
    const service = createProductService(repo);
    const created = await service.addProduct({ name: 'A', price: 12, stock: 2 });
    expect(created.name).toBe('A');
  });

  test('editProduct updates existing item', async () => {
    const repo = { editProduct: jest.fn().mockResolvedValue({ id: 'p-1', name: 'A', price: 10, stock: 1 }) };
    const service = createProductService(repo);
    const updated = await service.editProduct('p-1', { price: 10 });
    expect(updated.price).toBe(10);
  });

  test('deleteProduct removes item', async () => {
    const repo = { deleteProduct: jest.fn().mockResolvedValue(true) };
    const service = createProductService(repo);
    const deleted = await service.deleteProduct('p-1');
    expect(deleted).toBe(true);
  });
});
