/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
import { ProductStore } from '../../lib/ProductStore';

jest.mock('@zaiusinc/app-sdk', () => ({
  ...jest.requireActual('@zaiusinc/app-sdk'),
  storage: {
    kvStore: {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
    secrets: {
      get: jest.fn(),
      put: jest.fn(),
    },
    settings: {
      get: jest.fn(),
      put: jest.fn(),
    },
  },
}));

const { storage } = require('@zaiusinc/app-sdk');

describe('ProductStore', () => {
  const mockUUID = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID as `${string}-${string}-${string}-${string}-${string}`);
  });

  describe('create', () => {
    it('should create a product with defaults', async () => {
      storage.kvStore.get.mockResolvedValue(null);
      storage.kvStore.put.mockResolvedValue(undefined);

      const product = await ProductStore.create({ name: 'Test Product' });

      expect(product.id).toBe(mockUUID);
      expect(product.name).toBe('Test Product');
      expect(product.sku).toBe('');
      expect(product.price).toBe(0);
      expect(product.currency).toBe('USD');
      expect(product.inStock).toBe(true);
      expect(storage.kvStore.put).toHaveBeenCalledTimes(2);
    });

    it('should create a product with all fields', async () => {
      storage.kvStore.get.mockResolvedValue(null);
      storage.kvStore.put.mockResolvedValue(undefined);

      const product = await ProductStore.create({
        name: 'Full Product',
        sku: 'SKU-001',
        description: 'A product',
        price: 29.99,
        currency: 'EUR',
        category: 'Electronics',
        imageUrl: 'https://example.com/img.png',
        inStock: false,
      });

      expect(product.name).toBe('Full Product');
      expect(product.sku).toBe('SKU-001');
      expect(product.price).toBe(29.99);
      expect(product.currency).toBe('EUR');
      expect(product.inStock).toBe(false);
    });
  });

  describe('get', () => {
    it('should return a product when found', async () => {
      const mockProduct = { id: 'abc', name: 'Found' };
      storage.kvStore.get.mockResolvedValue(mockProduct);

      const result = await ProductStore.get('abc');
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found', async () => {
      storage.kvStore.get.mockResolvedValue(null);

      const result = await ProductStore.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const existing = {
        id: 'abc', name: 'Old', sku: 'S1', description: '', price: 10,
        currency: 'USD', category: '', imageUrl: '', inStock: true,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      };
      storage.kvStore.get.mockResolvedValue(existing);
      storage.kvStore.put.mockResolvedValue(undefined);

      const result = await ProductStore.update('abc', { name: 'New', price: 20 });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('New');
      expect(result!.price).toBe(20);
      expect(result!.id).toBe('abc');
    });

    it('should return null if product does not exist', async () => {
      storage.kvStore.get.mockResolvedValue(null);

      const result = await ProductStore.update('nonexistent', { name: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an existing product and update index', async () => {
      const existing = { id: 'abc', name: 'ToDelete' };
      storage.kvStore.get
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ids: ['abc', 'def'] });
      storage.kvStore.delete.mockResolvedValue(undefined);
      storage.kvStore.put.mockResolvedValue(undefined);

      const result = await ProductStore.delete('abc');

      expect(result).toEqual(existing);
      expect(storage.kvStore.delete).toHaveBeenCalledWith('product:abc');
      expect(storage.kvStore.put).toHaveBeenCalledWith('product_index', { ids: ['def'] });
    });

    it('should return null if product does not exist', async () => {
      storage.kvStore.get.mockResolvedValue(null);

      const result = await ProductStore.delete('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return paginated products', async () => {
      storage.kvStore.get
        .mockResolvedValueOnce({ ids: ['a', 'b', 'c'] })
        .mockResolvedValueOnce({ id: 'a', name: 'A' })
        .mockResolvedValueOnce({ id: 'b', name: 'B' });

      const result = await ProductStore.list(1, 2);

      expect(result.total).toBe(3);
      expect(result.products).toHaveLength(2);
    });

    it('should return empty list when no products', async () => {
      storage.kvStore.get.mockResolvedValue(null);

      const result = await ProductStore.list();

      expect(result.total).toBe(0);
      expect(result.products).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('should return all products', async () => {
      storage.kvStore.get
        .mockResolvedValueOnce({ ids: ['a', 'b'] })
        .mockResolvedValueOnce({ id: 'a', name: 'A' })
        .mockResolvedValueOnce({ id: 'b', name: 'B' });

      const result = await ProductStore.getAll();

      expect(result).toHaveLength(2);
    });
  });
});
