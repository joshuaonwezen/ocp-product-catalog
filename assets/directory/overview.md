# Product Catalog

A simple product catalog app for the Optimizely Connect Platform.

## Features

- Host your own product catalog within OCP
- REST API with Bearer token authentication for CRUD operations
- Automatic sync to Optimizely Graph as an External Content Source
- Use products in SaaS CMS via External Content Sources
- Bulk import job for full catalog sync

## Setup

1. Install the app in your OCP environment
2. An API token is auto-generated on install (view/change it in Settings)
3. Use the REST API to manage products
4. Products sync automatically to Optimizely Graph

## API Usage

```bash
# List products
curl -H "Authorization: Bearer <token>" "<function-url>/products"

# Create product
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","sku":"WDG-001","price":29.99}' \
  "<function-url>/products"

# Update product
curl -X PUT -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"price":24.99}' \
  "<function-url>/products/<id>"

# Delete product
curl -X DELETE -H "Authorization: Bearer <token>" \
  "<function-url>/products/<id>"
```
