export interface FieldElement {
  id: string;
  name: string;
  description: string;
  type: string;
}

export const productFields: FieldElement[] = [
  {
    id: 'id',
    name: 'Product ID',
    description: 'Unique identifier for the product (UUID)',
    type: 'string',
  },
  {
    id: 'name',
    name: 'Name',
    description: 'Display name of the product',
    type: 'string',
  },
  {
    id: 'sku',
    name: 'SKU',
    description: 'Stock keeping unit code',
    type: 'string',
  },
  {
    id: 'description',
    name: 'Description',
    description: 'Detailed product description text',
    type: 'string',
  },
  {
    id: 'price',
    name: 'Price',
    description: 'Product price as a decimal number',
    type: 'float',
  },
  {
    id: 'currency',
    name: 'Currency',
    description: 'ISO 4217 currency code (e.g. USD, EUR)',
    type: 'string',
  },
  {
    id: 'category',
    name: 'Category',
    description: 'Product category for classification',
    type: 'string',
  },
  {
    id: 'imageUrl',
    name: 'Image URL',
    description: 'URL to the product image asset',
    type: 'string',
  },
  {
    id: 'inStock',
    name: 'In Stock',
    description: 'Whether the product is currently available',
    type: 'boolean',
  },
  {
    id: 'createdAt',
    name: 'Created At',
    description: 'ISO 8601 timestamp when the product was created',
    type: 'string',
  },
  {
    id: 'updatedAt',
    name: 'Updated At',
    description: 'ISO 8601 timestamp when the product was last modified',
    type: 'string',
  },
];
