---
name: ocp-app-development
version: 0.1.0
description: Use when building, modifying, or debugging an OCP (Optimizely Connect Platform) app — adding functions, jobs, data sync sources or destinations, lifecycle hooks, OAuth flows, settings forms, Opal tools, ODP schema extensions, or anything that touches app.yml, the @zaiusinc/app-sdk, @zaiusinc/node-sdk, or @optimizely-opal/opal-tool-ocp-sdk.
---

# OCP App Development

OCP (Optimizely Connect Platform) is a serverless platform and marketplace for building apps that connect external systems with each other and with Optimizely products. Apps are published to the OCP App Directory as data sync apps, end-to-end apps, or Opal tools.

## App Types

### Data sync app

The app exposes either a custom **source** or **destination** in the OCP **Sync Manager** — the UI where customers pair sources and destinations. A source receives data from an external system and emits it into the **sync pipeline** — the runtime data flow between a paired source and destination; a destination receives data from the pipeline and delivers it to an external system. The app handles authorization and schema for that one external system.

**Use when:** you are integrating one external system as source or destination and want customers to decide what they sync it with — another external system or an Optimizely product.

### End-to-end app

The app defines the complete data flow between two specific, hardcoded systems. It handles authorization and schema for both sides and runs the sync automatically. Customers install, authorize both systems, and the app does the rest. These apps do not appear in the Sync Manager — the pairing is fixed.

**Use when:** both systems are predetermined by the developer — for example, receiving webhooks from an external platform and forwarding those events to ODP.

### Opal tool

The app exposes capabilities of an external service as AI tools in the Opal assistant. No data sync involved — the app receives tool calls from Opal and returns results.

**Use when:** you want Opal users to query or act on an external service through natural language — for example, running reports, searching records, or triggering actions.

**Decide the app type before writing any code** — it shapes the entire implementation. Ask: who decides which two systems are connected? Developer fixes both → end-to-end. Customer chooses at sync time → data sync. No sync, only AI tool calls → Opal tool.

## App Building Blocks

```
my-app/
├── app.yml           # Manifest — declares all components, metadata, runtime
├── package.json
├── tsconfig.json
├── forms/            # Settings form YAML (one file per section)
├── schema/           # ODP schema extensions (add custom fields to ODP objects)
├── assets/           # Static resources
└── src/
    ├── functions/    # Webhook handlers, HTTP endpoints, Opal tools
    ├── jobs/         # Background and scheduled tasks
    ├── lifecycle/    # Install, uninstall, OAuth, settings form handlers
    ├── sources/      # Data sync source logic and schema definitions
    └── destinations/ # Data sync destination logic and schema definitions
```

| SDK | Purpose |
| --- | --- |
| `@zaiusinc/app-sdk` | Core framework — functions, jobs, lifecycle, destinations, storage, notifications |
| `@zaiusinc/node-sdk` | ODP data access — events, customers, objects, GraphQL |
| `@optimizely-opal/opal-tool-ocp-sdk` | Opal AI tools — `@tool` and `@interaction` decorators |

Every component runs in the context of one OCP account and one installation, identified by:

- **`trackerId`** *(string)* — uniquely identifies an **OCP account** (a customer workspace).
- **`installId`** *(number)* — uniquely identifies an **installation** of the app. Each account installs the app at most once, giving a 1:1 mapping between `trackerId` and `installId`.

## Developer Journey

The OCP CLI drives the entire lifecycle — from registering the app to invoking deployed functions. Not all steps apply to every app type — follow the steps relevant to what you are building. **Always read the relevant reference file from the table below before acting on any step** — reference files contain exact commands, component types, and options.

1. **Reserve an app ID** *(one-time)* — register the app ID before writing any code
2. **Scaffold the project** — create the project structure with the latest `app-sdk` and `node-sdk`
3. **Add components** — scaffold each component (functions, jobs, sources, destinations)
4. **Settings form** — write `forms/*.yml` for per-account configuration (credentials, toggles, OAuth buttons)
5. **Schema** — write custom ODP fields in `schema/` if the app needs to extend the ODP data model
6. **Lifecycle hooks** — implement install, settings, uninstall, and OAuth lifecycle hooks
7. **Business logic** — write function and job bodies
8. **Validate** — validate the app manifest and type-check the TypeScript
9. **Package and upload** — package and upload the app for publishing
10. **Publish** — make the version available in the OCP App Directory
11. **Install** — install the app into an account, creating unique webhook URLs per installation
12. **Retrieve webhook URLs** — retrieve the webhook URLs for an installation to invoke the functions

## Modifying an Existing App

When a request comes in against an existing app rather than a new one:

1. **Read `app.yml` first** — it is the source of truth for what components exist, what SDKs are pinned, and what runtime is targeted
2. **Check installed SDK versions in `package.json`** before assuming an API exists
3. **Use the scaffolding commands for new components** even in an existing app — never hand-edit `app.yml` to add a function/job/source/destination
4. **Bump the version in `app.yml`** when shipping a change; use `-dev.N` suffix during development

## Components and Reference Files

| Need | Reference |
| --- | --- |
| `app.yml` structure and all configuration options | [references/app-yml.md](references/app-yml.md) |
| Webhook handler or HTTP endpoint (`App.Function`); global endpoint (`App.GlobalFunction`) | [references/function.md](references/function.md) |
| Background or scheduled task (`App.Job`) — historical imports, cron scheduling | [references/job.md](references/job.md) |
| ODP schema extensions — custom fields on ODP objects | [references/odp-schema.md](references/odp-schema.md) |
| `onInstall` — initial setup, generating secrets, registering external webhooks | [references/lifecycle/install.md](references/lifecycle/install.md) |
| `onSettingsForm` — saving settings, button actions, validation | [references/lifecycle/settings-form.md](references/lifecycle/settings-form.md) |
| Settings form elements — text, select, toggle, button, oauth_button | [references/settings-forms/elements.md](references/settings-forms/elements.md) |
| Settings form conditional logic — visibility, required, validation | [references/settings-forms/conditional-logic.md](references/settings-forms/conditional-logic.md) |
| OAuth — `onAuthorizationRequest` + `onAuthorizationGrant` | [references/lifecycle/oauth.md](references/lifecycle/oauth.md) |
| `onUninstall` + `canUninstall` — cleanup, deregistering webhooks | [references/lifecycle/uninstall.md](references/lifecycle/uninstall.md) |
| `onUpgrade` — version migration logic | [references/lifecycle/upgrade.md](references/lifecycle/upgrade.md) |
| Data sync source — static or dynamic schema, `sources.emit()` | [references/data-sync/source.md](references/data-sync/source.md) |
| Data sync destination — `ready()`, `deliver()`, static or dynamic schema | [references/data-sync/destination.md](references/data-sync/destination.md) |
| Opal tool function — `ToolFunction`, `GlobalToolFunction` | [references/opal-tools/tool-functions.md](references/opal-tools/tool-functions.md) |
| Opal `@tool` decorator — `ParameterType`, parameters, OptiID auth | [references/opal-tools/tools.md](references/opal-tools/tools.md) |
| Opal `@interaction` decorator — island UI components and interaction handlers | [references/opal-tools/islands-interactions.md](references/opal-tools/islands-interactions.md) |
| Storage — `settings`, `secrets`, `kvStore`, `sharedKvStore` | [references/app-sdk/storage.md](references/app-sdk/storage.md) |
| Notifications — `notifications.info/success/warn/error` | [references/app-sdk/notifications.md](references/app-sdk/notifications.md) |
| Logger — `logger.debug/info/warn/error` | [references/app-sdk/logging.md](references/app-sdk/logging.md) |
| CLI — `ocp app logs`, `get-log-level`, `set-log-level` | [references/cli-commands/logging.md](references/cli-commands/logging.md) |
| ODP events — `z.event()` | [references/node-sdk/events.md](references/node-sdk/events.md) |
| ODP customers — `z.customer()` | [references/node-sdk/customers.md](references/node-sdk/customers.md) |
| ODP objects — `z.object()`, custom object operations | [references/node-sdk/objects.md](references/node-sdk/objects.md) |
| ODP GraphQL — `z.graphql()` queries and mutations | [references/node-sdk/graphql.md](references/node-sdk/graphql.md) |
| ODP schema inspection — read schema, fields, objects | [references/node-sdk/schema.md](references/node-sdk/schema.md) |
| ODP identifiers — identity resolution and merging | [references/node-sdk/identifiers.md](references/node-sdk/identifiers.md) |
| ODP lists — list membership management | [references/node-sdk/lists.md](references/node-sdk/lists.md) |
| CLI — register, scaffold, and add components | [references/cli-commands/scaffolding.md](references/cli-commands/scaffolding.md) |
| CLI — validate the app manifest and TypeScript | [references/cli-commands/validation.md](references/cli-commands/validation.md) |
| CLI — deploy, publish, install, list functions and installations, and manage jobs | [references/cli-commands/deployment.md](references/cli-commands/deployment.md) |
