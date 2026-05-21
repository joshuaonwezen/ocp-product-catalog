import * as App from '@zaiusinc/app-sdk';
import { SourceSchemaField } from '@zaiusinc/app-sdk';
import { productFields } from '../data/ProductFields';

export class ProductSchema extends App.SourceSchemaFunction {
  public async getSourcesSchema(): Promise<App.SourceSchema> {
    const fields: SourceSchemaField[] = productFields.map((field) => ({
      name: field.id,
      display_name: field.name,
      description: field.description,
      type: field.type as 'string' | 'boolean' | 'float',
      primary: field.id === 'id',
    }));

    return {
      name: 'product_catalog_schema',
      description: 'Product Catalog Schema',
      display_name: 'Product Catalog',
      fields: fields.sort((a, b) => a.display_name.localeCompare(b.display_name)),
    };
  }
}
