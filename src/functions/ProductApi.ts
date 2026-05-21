import { Function, logger, Response, storage } from '@zaiusinc/app-sdk';
import { ProductStore } from '../lib/ProductStore';
import { AuthGuard } from '../lib/AuthGuard';
import { Product, ProductCreateRequest, ProductUpdateRequest } from '../types';

export class ProductApi extends Function {
  public async perform(): Promise<Response> {
    const authResult = await AuthGuard.validate(this.request.headers);
    if (!authResult.valid) {
      return this.jsonResponse(401, { error: 'Unauthorized. Provide a valid Bearer token.' });
    }

    const method = this.request.method;
    const pathParts = (this.request.path || '').split('/').filter(Boolean);
    // Find 'products' segment (path may have install ID prefix)
    const productsIdx = pathParts.indexOf('products');
    const productId = productsIdx >= 0 && pathParts.length > productsIdx + 1
      ? pathParts[productsIdx + 1] : null;

    try {
      switch (method) {
        case 'GET':
          return productId ? await this.getProduct(productId) : await this.listProducts();
        case 'POST':
          return await this.createProduct();
        case 'PUT':
          if (!productId) return this.jsonResponse(400, { error: 'Product ID required in path' });
          return await this.updateProduct(productId);
        case 'DELETE':
          if (!productId) return this.jsonResponse(400, { error: 'Product ID required in path' });
          return await this.deleteProduct(productId);
        default:
          return this.jsonResponse(405, { error: 'Method not allowed' });
      }
    } catch (error: any) {
      logger.error('ProductApi error:', error);
      return this.jsonResponse(500, { error: 'Internal server error' });
    }
  }

  private async getProduct(id: string): Promise<Response> {
    const product = await ProductStore.get(id);
    if (!product) {
      return this.jsonResponse(404, { error: 'Product not found' });
    }
    return this.jsonResponse(200, product);
  }

  private async listProducts(): Promise<Response> {
    const page = parseInt(this.request.params?.page as string, 10) || 1;
    const pageSize = parseInt(this.request.params?.pageSize as string, 10) || 50;

    const { products, total } = await ProductStore.list(page, pageSize);
    return this.jsonResponse(200, { products, total, page, pageSize });
  }

  private async createProduct(): Promise<Response> {
    const body = this.request.bodyJSON as ProductCreateRequest;
    if (!body?.name) {
      return this.jsonResponse(400, { error: 'Product name is required' });
    }

    const product = await ProductStore.create(body);
    await this.syncToSource(product, false);
    return this.jsonResponse(201, product);
  }

  private async updateProduct(id: string): Promise<Response> {
    const body = this.request.bodyJSON as ProductUpdateRequest;
    if (!body) {
      return this.jsonResponse(400, { error: 'Request body is required' });
    }

    const product = await ProductStore.update(id, body);
    if (!product) {
      return this.jsonResponse(404, { error: 'Product not found' });
    }

    await this.syncToSource(product, false);
    return this.jsonResponse(200, product);
  }

  private async deleteProduct(id: string): Promise<Response> {
    const product = await ProductStore.delete(id);
    if (!product) {
      return this.jsonResponse(404, { error: 'Product not found' });
    }

    await this.syncToSource(product, true);
    return this.jsonResponse(200, { message: 'Product deleted', id });
  }

  private async syncToSource(product: Product, isDeleted: boolean): Promise<void> {
    try {
      const webhooks = await storage.kvStore.get('webhooks');
      if (webhooks) {
        for (const [syncId, endpoint] of Object.entries(webhooks)) {
          const response = await fetch(endpoint as string, {
            method: 'POST',
            body: JSON.stringify({ ...product, _isDeleted: isDeleted }),
            headers: { 'Content-Type': 'application/json' },
          });
          if (!response.ok) {
            logger.warn(`Webhook sync to ${syncId} failed with status ${response.status}`);
          }
        }
      }
    } catch (error) {
      logger.warn('Real-time sync failed (will be caught by next bulk import):', error);
    }
  }

  private jsonResponse(status: number, body: any): Response {
    return new Response(status, body);
  }
}
