# Functions

- [App.Function](#appfunction)
- [App.GlobalFunction](#appglobalfunction)
- [Request](#request)
- [Response](#response)
- [Common mistakes](#common-mistakes)

A function in OCP is a webhook — a small executable that handles inbound HTTP requests triggered by external events. Use `App.Function` when the provider supports registering a webhook per installation (each account gets its own URL and full execution context). Use `App.GlobalFunction` when the provider only supports a single webhook URL — it executes without an installation context and is typically used to route incoming requests to the correct installation endpoint.

## App.Function

### Example

```typescript
import * as App from '@zaiusinc/app-sdk';
import { logger } from '@zaiusinc/app-sdk';

export class MyWebhook extends App.Function {
  public constructor(request: App.Request) {
    super(request);
  }

  public async perform(): Promise<App.Response> {
    logger.info('received webhook');

    const body = this.request.bodyJSON;  // parsed JSON body, null if empty
    if (!body) {
      return new App.Response(400, { error: 'No body' });
    }

    // ... process ...

    return new App.Response(200, { success: true });
  }
}
```

**app.yml:**
```yaml
functions:
  my_webhook:
    entry_point: MyWebhook
    description: Handles webhooks from ExternalService
```

### Accessing installation context

Call `getAppContext()` only when the handler needs the account or installation context.

```typescript
import * as App from '@zaiusinc/app-sdk';
import { getAppContext } from '@zaiusinc/app-sdk';

export class MyWebhook extends App.Function {
  public async perform(): Promise<App.Response> {
    const { trackerId, installId } = getAppContext();
    // ... use trackerId / installId ...
    return new App.Response(200);
  }
}
```

## App.GlobalFunction

### Example

```typescript
import * as App from '@zaiusinc/app-sdk';
import { storage, functions } from '@zaiusinc/app-sdk';

export class MyGlobalFn extends App.GlobalFunction {
  public constructor(request: App.Request) {
    super(request);
  }

  public async perform(): Promise<App.Response> {
    const trackerId = this.request.params['tracker_id'] as string;
    if (!trackerId) {
      return new App.Response(400, { error: 'Missing tracker_id' });
    }

    const { installId } = await storage.sharedKvStore.get<{ installId: number }>(trackerId);
    if (!installId) {
      return new App.Response(404, { error: 'No installation found' });
    }

    const endpoints = await functions.getEndpoints(installId);
    const response = await fetch(endpoints['my_webhook'], {
      method: this.request.method,
      body: JSON.stringify(this.request.bodyJSON),
      headers: { 'content-type': 'application/json' },
    });

    return new App.Response(response.status);
  }
}
```

**app.yml:**
```yaml
functions:
  my_global_fn:
    entry_point: MyGlobalFn
    description: Routes incoming webhooks to the correct installation
    global: true
```

Global functions have no installation context — only `storage.sharedKvStore` is accessible.

## Request

| Property | Type | Description |
| --- | --- | --- |
| `this.request.method` | `string` | HTTP method (`GET`, `POST`, etc.) |
| `this.request.path` | `string` | Request path |
| `this.request.params` | `QueryParams` | Query string parameters — `params['key']` |
| `this.request.headers` | `Headers` | Request headers — `headers.get('x-signature')` |
| `this.request.bodyJSON` | `any` | Parsed JSON body; `null` if body is empty |
| `this.request.body` | `Uint8Array` | Raw body bytes |
| `this.request.contentType` | `string \| null` | Content-Type header value (without parameters) |

## Response

```typescript
new App.Response(status)              // status only
new App.Response(status, bodyJSON)    // status + JSON body (sets content-type: application/json)
```

**Critical:** status is the **first** argument, body is the **second**. This is the opposite of the web standard `Response` constructor. Using `new App.Response(body, status)` compiles without error but returns a broken response.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| `new App.Response(body, status)` | `new App.Response(status, body)` — status is first |
| `new Response(200, {...})` | Must use `App.Response`, not the web standard `Response` |
| Missing constructor that calls `super(request)` | Always define the constructor and pass `request` to `super()` |
