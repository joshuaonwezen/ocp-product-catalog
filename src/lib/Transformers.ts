import { Product } from '../types';

export function productToSourcePayload(product: Product): Record<string, any> {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    price: product.price,
    currency: product.currency,
    category: product.category,
    imageUrl: product.imageUrl,
    inStock: product.inStock,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
