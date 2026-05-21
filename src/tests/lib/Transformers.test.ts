import { productToSourcePayload } from '../../lib/Transformers';
import { Product } from '../../types';

describe('productToSourcePayload', () => {
  it('should transform a product to a source payload', () => {
    const product: Product = {
      id: 'abc-123',
      name: 'Test Product',
      sku: 'SKU-001',
      description: 'A test product',
      price: 19.99,
      currency: 'USD',
      category: 'Electronics',
      imageUrl: 'https://example.com/img.png',
      inStock: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const payload = productToSourcePayload(product);

    expect(payload).toEqual({
      id: 'abc-123',
      name: 'Test Product',
      sku: 'SKU-001',
      description: 'A test product',
      price: 19.99,
      currency: 'USD',
      category: 'Electronics',
      imageUrl: 'https://example.com/img.png',
      inStock: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  });

  it('should not include extra properties from the product', () => {
    const product = {
      id: 'abc',
      name: 'Test',
      sku: '',
      description: '',
      price: 0,
      currency: 'USD',
      category: '',
      imageUrl: '',
      inStock: true,
      createdAt: '',
      updatedAt: '',
      extraField: 'should not appear',
    } as Product;

    const payload = productToSourcePayload(product);

    expect(payload).not.toHaveProperty('extraField');
    expect(Object.keys(payload)).toHaveLength(11);
  });
});
