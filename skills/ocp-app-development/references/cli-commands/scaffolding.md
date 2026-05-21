# CLI — Scaffolding

Use the OCP CLI to register, initialize, and add components. Never hand-edit `app.yml` to add a function, job, source, or destination — always use the scaffolding commands so both the TypeScript file and the `app.yml` entry are created together.

- [Register](#register)
- [Init](#init)
- [Add function](#add-function)
- [Add job](#add-job)
- [Add source](#add-source)
- [Add destination](#add-destination)

## Register

One-time step. Reserve the app ID before writing any code. **Before running this command, ask the user whether the app ID is already registered. Run it only if the user confirms it has not been registered yet** — running it against an existing ID will fail or conflict.

```bash
ocp app register --appId <value> --name <value> --product <value> --no-personal
```

| Flag | Required | Description |
| --- | --- | --- |
| `--appId` | Yes | App ID to reserve (e.g. `my_app`) |
| `--name` | Yes | Display name of the app |
| `--product` | Yes | Target product: `HUB` (OCP) or `ODP` |
| `--personal` / `--no-personal` | Yes | Pass `--no-personal` to share with your org, `--personal` to keep it private |

All four flags must be provided — the command goes interactive if any are omitted.

**Conventions:**
- `--appId`: lowercase letters, numbers, and underscores only — no hyphens (e.g. `my_app`, `stripe_odp_sync`)
- `--name`: human-readable display name shown in the App Directory (e.g. `My App`, `Stripe ODP Sync`)

## Init

Scaffold a new app project with the latest `app-sdk` and `node-sdk`.

```bash
ocp app init --app-id <value> --display-name <value> --template <value> \
  --version <value> --summary <value> --support-url <value> \
  --contact-email <value> --category <value> \
  --package-manager <value> --directory <value> --no-prompt
```

**The target directory must contain no files or folders — including hidden ones. `ocp app init` will fail if anything exists inside it.**

Interactive by default — prompts for project details and creates the project directory if needed.
To run non-interactively, pass `--no-prompt` plus every flag marked Required below; skipping a Required flag either hangs at a prompt or produces an `app.yml` that won't pass validation.

| Flag | Required | Description |
| --- | --- | --- |
| `--app-id` | Yes | App ID (e.g. `my_app`) |
| `--display-name` | Yes | Display name (e.g. `My App`) |
| `--template` | Yes | Template display name — must be one of the exact strings below |
| `--version` | Yes | Version (e.g. `1.0.0-dev.1`) |
| `--summary` | Yes | Brief app summary |
| `--support-url` | Yes | Support URL |
| `--contact-email` | Yes | Contact email address |
| `--category` | Yes | App category — see `app-yml.md` for valid values |
| `--package-manager` | No | Package manager: `yarn`, `yarn-berry`, `npm`, `pnpm`, `bun` |
| `--directory` | Yes | Target directory for the project |

Pass the full template display name exactly as listed:

| Template name | Use for |
| --- | --- |
| `"Basic OCP Sample"` | OCP app with example functions and jobs|
| `"Empty OCP Project"` | OCP app with no example code |
| `"Basic ODP Sample"` | ODP app with example functions and jobs |
| `"Empty ODP Project"` | ODP app with no example code |
| `"Opal tool OCP app"` | OCP app that implements Opal tools |

## Add function

```bash
ocp add function
```

| Flag | Description |
| --- | --- |
| `--name` | Function name in `snake_case` |
| `--description` | Function description |
| `--global` | Create a global function instead of a regular function |

Creates `src/functions/<ClassName>.ts` and adds the entry to `app.yml`.

## Add job

```bash
ocp add job
```

| Flag | Description |
| --- | --- |
| `--name` | Job name in `snake_case` |
| `--description` | Job description |
| `--cron` | Optional cron schedule (e.g. `"0 0 0 ? * *"`) |

Creates `src/jobs/<ClassName>.ts` and adds the entry to `app.yml`.

## Add source

```bash
ocp add source
```

| Flag | Description |
| --- | --- |
| `--name` | Source name in `snake_case` |
| `--description` | Source description |
| `--schema` | Schema type: `static` (YAML file) or `dynamic` (TypeScript class) |
| `--schema-name` | Schema file or class name (defaults to source name) |

Creates `src/sources/schema/<schemaName>.yml` (static) or `src/sources/<SchemaClass>.ts` (dynamic) and adds the entry to `app.yml`. `<schemaName>` defaults to the source name when `--schema-name` is omitted.

## Add destination

```bash
ocp add destination
```

| Flag | Description |
| --- | --- |
| `--name` | Destination name in `snake_case` |
| `--description` | Destination description |
| `--schema` | Schema type: `static` (YAML file) or `dynamic` (TypeScript class) |
| `--schema-name` | Schema file or class name (defaults to destination name) |

Creates `src/destinations/<ClassName>.ts` and `src/destinations/schema/<schemaName>.yml` (static) or `src/destinations/<SchemaClass>.ts` (dynamic), and adds the entry to `app.yml`. `<schemaName>` defaults to the destination name when `--schema-name` is omitted.