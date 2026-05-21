import { storage, KVHash } from '@zaiusinc/app-sdk';
import { Product, ProductCreateRequest, ProductUpdateRequest } from '../types';

const PRODUCT_KEY_PREFIX = 'product:';
const INDEX_KEY = 'product_index';

interface ProductIndex extends KVHash {
  ids: string[];
}

export class ProductStore {
  private static async getIndex(): Promise<ProductIndex> {
    const index = await storage.kvStore.get(INDEX_KEY) as ProductIndex | null;
    if (!index || !index.ids || !Array.isArray(index.ids)) {
      return { ids: [] };
    }
    return index;
  }

  public static async create(data: ProductCreateRequest): Promise<Product> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const product: Product = {
      id,
      name: data.name,
      sku: data.sku || '',
      description: data.description || '',
      price: data.price || 0,
      currency: data.currency || 'USD',
      category: data.category || '',
      imageUrl: data.imageUrl || '',
      inStock: data.inStock ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await storage.kvStore.put(`${PRODUCT_KEY_PREFIX}${id}`, product as unknown as KVHash);

    const index = await this.getIndex();
    if (!index.ids) index.ids = [];
    index.ids.push(id);
    await storage.kvStore.put(INDEX_KEY, index);

    return product;
  }

  public static async get(id: string): Promise<Product | null> {
    const product = await storage.kvStore.get(`${PRODUCT_KEY_PREFIX}${id}`);
    return product as unknown as Product | null;
  }

  public static async update(id: string, data: ProductUpdateRequest): Promise<Product | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated: Product = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };

    await storage.kvStore.put(`${PRODUCT_KEY_PREFIX}${id}`, updated as unknown as KVHash);
    return updated;
  }

  public static async delete(id: string): Promise<Product | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    await storage.kvStore.delete(`${PRODUCT_KEY_PREFIX}${id}`);

    const index = await this.getIndex();
    index.ids = (index.ids || []).filter((pid: string) => pid !== id);
    await storage.kvStore.put(INDEX_KEY, index);

    return existing;
  }

  public static async list(page: number = 1, pageSize: number = 50): Promise<{ products: Product[]; total: number }> {
    const index = await this.getIndex();
    const ids = index.ids || [];
    const total = ids.length;
    const start = (page - 1) * pageSize;
    const pageIds = ids.slice(start, start + pageSize);

    const results = await Promise.all(pageIds.map((id) => this.get(id)));
    const products = results.filter((p): p is Product => p !== null && !!p.id);

    return { products, total };
  }

  public static async getAll(): Promise<Product[]> {
    const index = await this.getIndex();
    const ids = index.ids || [];
    const results = await Promise.all(ids.map((id) => this.get(id)));
    return results.filter((p): p is Product => p !== null && !!p.id);
  }
}
