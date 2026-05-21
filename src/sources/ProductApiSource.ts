import { SourceFunction, logger, Response } from '@zaiusinc/app-sdk';
import { productToSourcePayload } from '../lib/Transformers';
import { Product } from '../types';

export class ProductApiSource extends SourceFunction {
  public async perform(): Promise<Response> {
    if (this.request.method !== 'POST') {
      logger.error('[ProductApiSource] Method not allowed:', this.request.method);
      return new Response(405, 'Method not allowed');
    }

    const body = this.request.bodyJSON;
    if (!body) {
      logger.error('[ProductApiSource] No body supplied');
      return new Response(400, 'No body supplied');
    }

    try {
      const isDeleted = body._isDeleted === true;
      const product = body as Product;
      const payload = productToSourcePayload(product);

      logger.info('[ProductApiSource]', isDeleted ? 'Deleting' : 'Emitting', 'product:', product.id);
      await this.source.emit({ data: { ...payload, _isDeleted: isDeleted } });

      return new Response(200, 'OK');
    } catch (error: any) {
      logger.error('[ProductApiSource] Error emitting product:', error);
      return new Response(500, 'Internal Server Error');
    }
  }
}
