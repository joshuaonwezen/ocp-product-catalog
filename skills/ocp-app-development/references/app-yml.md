# app.yml

`app.yml` is the manifest for an OCP app. It declares every component the app exposes and controls how the OCP platform builds, routes, and runs the app.

## Complete structure

```yaml
meta:
  app_id: my_app              # must start with a lowercase letter; lowercase letters, numbers, underscores; 3–32 chars
  display_name: My App        # shown in the App Directory
  version: 1.0.0-dev.1        # semver — see Version format below
  vendor: my_org              # your vendor handle — lowercase snake_case, no hyphens
  summary: Short description  # one line, shown in the App Directory
  support_url: https://...
  contact_email: support@example.com
  categories:
    - Marketing               # see Categories below
  availability:
    - all                     # see Availability below

runtime: node22               # always node22 for new apps

functions:
  my_webhook:
    entry_point: MyWebhook    # class extends App.Function
    description: Handles incoming webhooks from ExternalService

  global_fn:
    entry_point: GlobalFn     # class extends App.GlobalFunction
    description: Account-level endpoint — no installation context
    global: true

  opal_tool:
    entry_point: OpalToolFunction  # class extends ToolFunction from @optimizely-opal/opal-tool-ocp-sdk
    description: Opal AI tool
    opal_tool: true                # marks this function as an Opal tool

jobs:
  my_job:
    entry_point: MyJob        # class extends App.Job
    description: Processes records in the background
    cron: 0 0 0 ? * *        # optional — Quartz cron, omit for manually-triggered jobs

sources:
  my_source:
    description: Syncs products from ExternalService
    schema: product           # static — references src/sources/schema/product.yml
    # OR dynamic schema:
    # schema:
    #   entry_point: ProductSchema   # class extends App.SourceSchemaFunction

destinations:
  my_dest:
    entry_point: MyDest       # class extends App.Destination<T>
    description: Sends contacts to ExternalService
    schema: contact           # static — references src/destinations/schema/contact.yml
    # OR dynamic schema:
    # schema:
    #   entry_point: ContactSchema   # class extends App.DestinationSchemaFunction
    supports_delete: true     # optional — set true if the destination handles _isDeleted records

environment:
  - MY_API_KEY                # app-level env vars — set via CLI, NOT stored in source
  - MY_API_SECRET
```

## Version format

| Format | Use |
| --- | --- |
| `1.0.0-dev.N` | Development iterations — publishable without review |
| `1.0.0-beta.N` | Beta releases |
| `1.0.0-private` | Private release |
| `1.0.0` | Public release — triggers review process on `ocp app prepare` |

Bump `-dev.N` during development. Use `ocp app prepare --bump-dev-version` to auto-increment.

## Availability

| Value | Meaning |
| --- | --- |
| `all` | Available in all regions |
| `us` | US only |
| `eu` | EU only |
| `au` | APAC only |

`all` must not be combined with specific regions.

## Categories

`Accounting & Finance`, `Advertising`, `Analytics & Reporting`, `Attribution & Linking`, `Audience Sync`, `CDP / DMP`, `Channel`, `Commerce Platform`, `Content Management`, `CRM`, `Customer Experience`, `Data Quality & Enrichment`, `Lead Capture`, `Loyalty & Rewards`, `Marketing`, `Merchandising & Products`, `Offers`, `Opal`, `Personalization & Content`, `Point of Sale`, `Productivity`, `Reviews & Ratings`, `Site & Content Experience`, `Subscriptions`, `Surveys & Feedback`, `Testing & Utilities`

