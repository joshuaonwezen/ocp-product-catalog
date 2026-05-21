# Product Catalog — OCP App

A self-contained product catalog built on the [Optimizely Connect Platform (OCP)](https://docs.developers.optimizely.com/optimizely-connect-platform/docs). It stores products inside OCP's key-value store, exposes them through a REST API and a web UI, and syncs every change to **Optimizely Graph** as an External Content Source — so products are immediately available in Optimizely CMS and downstream content experiences.

---

## What it does

| Capability | How |
|---|---|
| **Store products** | OCP KV store (`product:{id}` keys + `product_index`) |
| **CRUD via REST API** | `product_api` function — Bearer token auth |
| **Manage via browser UI** | `product_ui` function — embedded SPA served by the app |
| **Real-time sync to Graph** | Each API write POSTs to registered webhook endpoints |
| **Bulk import to Graph** | `import_products` job — paginated, resumable, retry logic |
| **Webhook lifecycle** | Source lifecycle registers/removes webhook URLs per data-sync |

### Data flow

```
Browser / API client
        │
        ▼
  ProductApi (REST)
  ├── Creates / updates / deletes product in ProductStore (KV)
  └── POSTs to each registered webhook URL
              │
              ▼
        ProductApiSource (SourceFunction)
        └── Transforms payload → source.emit()
                    │
                    ▼
            Optimizely Graph
            (External Content Source)
```

The bulk import path replaces the webhook with a direct `source.emit()` loop over all stored products.

---

## Project structure

```
ocp_app_products/
├── app.yml                        # OCP app manifest
├── forms/
│   └── settings.yml               # Settings UI schema (API token, UI URL)
├── assets/
│   └── directory/overview.md      # App Directory description
└── src/
    ├── data/
    │   └── ProductFields.ts        # Canonical field definitions
    ├── types/
    │   └── index.ts                # Product interfaces
    ├── lib/
    │   ├── ProductStore.ts         # KV CRUD + pagination
    │   ├── AuthGuard.ts            # Bearer token validation
    │   └── Transformers.ts         # Product → Graph payload
    ├── functions/
    │   ├── ProductApi.ts           # REST API function
    │   └── ProductUI.ts            # Web UI function
    ├── sources/
    │   ├── ProductSchema.ts        # Graph schema definition
    │   ├── ProductApiSource.ts     # Webhook receiver → source.emit
    │   ├── ProductLifecycle.ts     # Webhook register/deregister
    │   └── jobs/
    │       └── ImportProducts.ts   # Bulk sync job
    ├── lifecycle/
    │   └── Lifecycle.ts            # App install/upgrade/settings hooks
    └── tests/
        └── lib/                    # Unit tests (ProductStore, AuthGuard, Transformers)
```

---

## Key files explained

### `app.yml`
The OCP manifest. Declares the app ID, version, runtime, and all entry points. **Two functions**, **one source** (with a job and lifecycle), and no external environment variables — the app is self-contained.

```yaml
functions:
  product_api:      # REST CRUD + real-time sync trigger
  product_ui:       # Browser-based product management SPA

sources:
  product:
    schema:   ProductSchema      # Field definitions for Optimizely Graph
    function: ProductApiSource   # Receives webhook POSTs, emits to Graph
    jobs:
      import_products: ImportProducts  # Bulk sync all products
    lifecycle: ProductLifecycle  # Registers/removes webhook URLs
```

> OCP docs: [App structure / app.yml](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/app-structure)

---

### `src/data/ProductFields.ts`
Single source of truth for every product field. Both `ProductSchema.ts` (what Graph sees) and the UI form derive from this array — adding a field here automatically adds it everywhere.

Fields: `id`, `name`, `sku`, `description`, `price`, `currency`, `category`, `imageUrl`, `inStock`, `createdAt`, `updatedAt`.

---

### `src/lib/ProductStore.ts`
Wraps the OCP KV store. Products are stored under `product:{uuid}` keys. A separate `product_index` key holds the ordered list of IDs for efficient pagination without a full scan.

```typescript
// Key layout in OCP KV store
"product_index"       → { ids: ["uuid1", "uuid2", ...] }
"product:{uuid}"      → { id, name, sku, price, ... }
```

> OCP docs: [Key-value store](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/key-value-store)

---

### `src/functions/ProductApi.ts`
The REST API entry point. Routes `GET / POST / PUT / DELETE` on `/products` and `/products/{id}`. Every mutating operation calls `syncToSource()` which fires a `POST` to every webhook URL registered in the KV store under the `webhooks` key.

```typescript
// After each write:
await this.syncToSource(product, isDeleted);

// syncToSource reads KV webhooks map and POSTs to each endpoint
const webhooks = await storage.kvStore.get('webhooks');
for (const [syncId, endpoint] of Object.entries(webhooks)) {
  await fetch(endpoint, { method: 'POST', body: JSON.stringify({...product, _isDeleted}) });
}
```

If the webhook POST fails, the error is swallowed and logged — the next bulk import will catch up.

> OCP docs: [Functions](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/functions-ocp2)

---

### `src/sources/ProductLifecycle.ts`
Handles the data-sync lifecycle. When a user creates a new data sync in OCP (connecting this source to Optimizely Graph), `onSourceCreate` fires — it stores the webhook URL under `webhooks.{dataSyncId}` in the KV store. When the sync is deleted, `onSourceDelete` removes it.

```typescript
// onSourceCreate — called when a new Sync Manager sync is configured
await storage.kvStore.patch('webhooks', {
  [this.config.dataSyncId]: this.config.webhookUrl
});
```

This is what makes real-time sync work: the `ProductApi` reads from the same `webhooks` map.

> OCP docs: [Data sync source](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/data-sync-source)

---

### `src/sources/ProductApiSource.ts`
The `SourceFunction` that receives webhook POSTs from `ProductApi`. It transforms the product payload and calls `source.emit()` which sends the record to Optimizely Graph. The `_isDeleted: true` flag tells Graph to remove the record.

```typescript
const payload = productToSourcePayload(product);
await this.source.emit({ data: { ...payload, _isDeleted: isDeleted } });
```

---

### `src/sources/jobs/ImportProducts.ts`
A resumable, paginated bulk-sync job. It uses a simple state machine (`SYNC_PRODUCTS → DONE`) and processes 50 products per iteration. Up to 3 retries with a 1-second backoff on failure.

```
prepare()  → initialises state { step, page, retries, waitUntil }
perform()  → dispatches to step handler each invocation
  └── stepSyncProducts: list page N → emit each → increment page
  └── stepDone: mark complete
```

Run this after enabling a data sync to backfill existing products into Graph.

> OCP docs: [Jobs and cron scheduling](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/jobs-and-cron)

---

### `src/lifecycle/Lifecycle.ts`
App-level lifecycle hooks. `onInstall` auto-generates an API token (UUID) and stores it in `storage.secrets`. The token is also written to `storage.settings` so it appears in the Settings UI. `onSettingsForm` handles the "Refresh UI URL" button which rebuilds the `product_ui` endpoint URL.

> OCP docs: [Lifecycle of an app in OCP](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/lifecycle-of-an-app-in-ocp)

---

## Local development

### Prerequisites

- Node.js 22
- Yarn
- OCP CLI v2 (see install steps below)
- [`@optimizely/ocp-local-env`](https://www.npmjs.com/package/@optimizely/ocp-local-env) (installed globally via npm)
- OCP developer account — get your API key from the OCP developer portal
  - If you don't have access to the OCP developer portal send an email to integrations@optimizely.com requesting a dev account for OCP stating the github usernames and emails of your developers and the name of the organization on the contract with Optimizely

### Install the OCP CLI

**Mac / Linux**
```bash
curl -fsSL https://cli.ocp.optimizely.com/install.sh | bash
```

The installer downloads the latest release, verifies the checksum, and adds the `ocp` binary to `~/.local/share/ocp/client/bin`. Restart your terminal (or run `source ~/.zshrc`) so `ocp` is on your `PATH`.

> GPG is not required — if prompted about skipping signature verification, answer `y`.

**Windows (PowerShell)**
```powershell
iwr -useb https://cli.ocp.optimizely.com/install.ps1 | iex
```

**Verify the install**
```bash
ocp --version
# @optimizely/ocp-cli-v2/2.x.x darwin-arm64 node-v22.x.x
```

**Alternatively — run without installing**
```bash
npx @optimizely/ocp-cli-v2 <command>
```

### Authenticate

Create `~/.ocp/credentials.json` with your OCP API key (you get a link to create one when emailing integrations@optimizely.com):

```bash
mkdir -p ~/.ocp
echo '{"apiKey": "<YOUR_OCP_API_KEY>"}' > ~/.ocp/credentials.json
```

Verify authentication and list your sandbox tracker IDs:

```bash
ocp accounts whoami
```

### Install the local testing tool

```bash
npm install -g @optimizely/ocp-local-env
```

### Start the local testing tool

```bash
yarn install

# Port 3000 is OCP's default; use --port if something else is already there
ocp-local-env --port 3000 --path .
```

Open **http://localhost:3000** in your browser. The local testing tool simulates the full OCP runtime including KV store, settings, lifecycle hooks, and source emission.

**Direct function URLs (local):**

| Function | URL |
|---|---|
| Product UI | `http://localhost:3001/functions/product_catalog/product_ui/<guid>?trackerId=local-testing-tracker` |
| REST API | `http://localhost:3001/functions/product_catalog/product_api/<guid>/products?trackerId=local-testing-tracker` |

The `<guid>` values are auto-generated on first access and persisted to `.ocp-local/config.json`. The local API token is in `.ocp-local/settings.json`.

> OCP docs: [Local testing](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/local-testing)

---

## Deployment

### 1. Register the app (once)

```bash
ocp app register --appId product_catalog --name "Product Catalog" --product HUB
```

### 2. Publish a dev version

```bash
# app.yml version must end in -dev.N (e.g. 1.0.1-dev.3)
ocp app prepare --publish
```

This runs `yarn validate` (build + lint + tests), packages the source, uploads it, and waits for the OCP build to finish.

### 3. Install to your sandbox

```bash
ocp accounts whoami          # find your tracker ID
ocp directory install product_catalog@1.0.1-dev.3 <TRACKER_ID>
```

> OCP docs: [App versioning](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/app-versioning)

---

## Configuring Optimizely Graph sync

After installing the app in your OCP sandbox:

1. **App Directory → Product Catalog → Settings**
   - Note the auto-generated API token
   - Note the Product Management UI URL

2. **Data Setup → Sync Manager → New Sync**
   - Source: **Product Catalog → Product**
   - Destination: **Optimizely Graph**
   - Save and **Enable**

   Enabling the sync triggers `ProductLifecycle.onSourceCreate`, which registers the Graph webhook URL in the KV store. From this point on every product write is forwarded to Graph in real time.

3. **Backfill existing products**
   - App Directory → Product Catalog → **Jobs** → Run **Import Products**
   - The job pages through all stored products (50 per batch) and emits each to Graph.

---

## REST API reference

All endpoints require `Authorization: Bearer <token>` using the token from Settings.

```bash
BASE="<product_api function URL>"
TOKEN="<api token>"

# List products (paginated)
curl -H "Authorization: Bearer $TOKEN" "$BASE/products?page=1&pageSize=50"

# Get a single product
curl -H "Authorization: Bearer $TOKEN" "$BASE/products/<id>"

# Create a product
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","sku":"WDG-001","price":29.99,"currency":"USD","inStock":true}' \
  "$BASE/products"

# Update a product
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price":24.99}' \
  "$BASE/products/<id>"

# Delete a product
curl -X DELETE -H "Authorization: Bearer $TOKEN" "$BASE/products/<id>"
```

**Product fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes (on create) | Display name |
| `sku` | string | No | Stock keeping unit |
| `description` | string | No | |
| `price` | float | No | |
| `currency` | string | No | ISO 4217, default `USD` |
| `category` | string | No | |
| `imageUrl` | string | No | |
| `inStock` | boolean | No | |
| `id` | string | — | UUID, auto-assigned |
| `createdAt` | string | — | ISO 8601, auto-assigned |
| `updatedAt` | string | — | ISO 8601, auto-updated |

---

## Claude Code skills

The `skills/ocp-app-development/` directory contains a [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code) that gives Claude deep context about OCP development patterns — app types, SDK APIs, CLI commands, storage, lifecycle hooks, and more. It is automatically loaded by Claude when working in this project via the `CLAUDE.md` file at the repo root.

### What the skill covers

| Reference file | Topic |
|---|---|
| `SKILL.md` | OCP overview, app types, developer journey, component index |
| `references/app-yml.md` | Full `app.yml` structure and all configuration options |
| `references/function.md` | `App.Function` and `App.GlobalFunction` patterns |
| `references/job.md` | `App.Job` — background tasks, state machines, pagination |
| `references/app-sdk/storage.md` | `settings`, `secrets`, `kvStore`, `sharedKvStore` APIs |
| `references/app-sdk/logging.md` | `logger` usage and log levels |
| `references/app-sdk/notifications.md` | In-app notification API |
| `references/cli-commands/deployment.md` | `prepare`, `publish`, `install`, job management |
| `references/cli-commands/scaffolding.md` | `register`, `init`, `add` |
| `references/cli-commands/validation.md` | `validate` and type-check commands |
| `references/cli-commands/logging.md` | `app logs`, `get-log-level`, `set-log-level` |

### How it is loaded

`CLAUDE.md` at the project root uses Claude Code's `@`-import syntax to pull in the skill on every session:

```markdown
@skills/ocp-app-development/SKILL.md
```

Claude Code automatically reads `CLAUDE.md` when you open the project, so no manual setup is needed.

### Installing the skill globally (optional)

To make the skill available across **all** your OCP projects without needing a `CLAUDE.md` in each one, copy the skill to your global Claude skills directory:

```bash
mkdir -p ~/.claude/skills
cp -r skills/ocp-app-development ~/.claude/skills/
```

Claude Code will then load the skill automatically in any project.

---

## Running tests

```bash
yarn test          # Jest + coverage report
yarn lint          # TypeScript type check + ESLint
yarn validate      # build + lint + test (same as CI)
```

---

## OCP documentation

| Topic | Link |
|---|---|
| Platform overview | https://docs.developers.optimizely.com/optimizely-connect-platform/docs |
| App structure & app.yml | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/app-structure |
| Functions | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/functions-ocp2 |
| Data sync source | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/data-sync-source |
| Jobs & cron | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/jobs-and-cron |
| Storage (KV, settings, secrets) | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/storage-options |
| App lifecycle | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/lifecycle-of-an-app-in-ocp |
| Local testing | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/local-testing |
| App versioning | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/app-versioning |
| OCP CLI v2 migration | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/ocp-cli-v2-migration |
| End-to-end guide (Shopify sync source) | https://docs.developers.optimizely.com/optimizely-connect-platform/docs/shopify-sync-source-end-to-end-guide |
