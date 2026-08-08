# Brief — port the PostHog provider to TypeScript

**Tool:** `agy --model=claude-sonnet-4-6` (no `--effort` flag — it is rejected for
this model and kills the run).

**Scope:** exactly one unit. Do not start anything else.

## Working directory

`/workspaces/876/apps/api`

## The single task

Port `providers/posthog/client.py` (185 lines, Python/FastAPI) to
`src/providers/posthog/client.ts` (TypeScript/Express).

**Create exactly two files. Create nothing else.**

| File                              | Contents                                                            |
| --------------------------------- | ------------------------------------------------------------------- |
| `src/providers/posthog/client.ts` | The whole port: `PostHogClient`, `getPostHogClient`, `captureEvent` |
| `src/providers/posthog/index.ts`  | Re-export the three public symbols above and nothing else           |

**Files you must NOT create or modify** (another agent owns them):

- anything under `src/providers/twilio/`
- `src/providers/communications.ts`
- `src/platform/phone.ts`, `src/platform/user-agent.ts`
- `src/config/**`, `src/http/**`, `src/platform/**`
- any `.py` file
- `package.json`, `pnpm-lock.yaml` — **do not install any dependency.** Use the
  global `fetch`. There is no `httpx` equivalent and none is wanted.

## The exact shape to follow

Read `apps/api/src/providers/twilio/errors.ts` and
`apps/api/src/providers/twilio/client.ts` first — they are the worked example
for a ported provider in this codebase. Match their style exactly: file-level
JSDoc, named exports, `AppHttpError` for failures, `getLogger` for logs.

### Imports available to you

```ts
import { AppHttpError } from '@/http/errors' // new AppHttpError({ code, message, httpStatus })
import { getLogger } from '@/platform/logger' // getLogger('posthog') -> pino logger
```

`AppHttpError`'s constructor takes `{ code: string; message: string; httpStatus: number }`.
The pino logger call form is `log.warn({ field: value }, 'event.name')` — the
**object first, the message second**. Do not use `console.*`.

### Translation table — follow it literally

| Python                                     | TypeScript                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `httpx.AsyncClient(timeout=20.0)`          | `fetch(url, { signal: AbortSignal.timeout(20_000) })`            |
| `httpx.AsyncClient(timeout=5.0)` (capture) | `AbortSignal.timeout(5_000)`                                     |
| `response.raise_for_status()`              | `if (!response.ok) throw …` — see error mapping below            |
| `status.HTTP_502_BAD_GATEWAY`              | `502`                                                            |
| `status.HTTP_503_SERVICE_UNAVAILABLE`      | `503`                                                            |
| `status.HTTP_204_NO_CONTENT`               | `204`                                                            |
| `dict[str, Any]`                           | `Record<string, unknown>`                                        |
| snake_case method names                    | camelCase (`list_features` → `listFeatures`)                     |
| snake_case **JSON payload keys**           | **keep snake_case** — they are PostHog wire fields, never rename |

### Method-by-method requirements

1. **`constructor(opts: { host: string; projectId: number; personalApiKey: string; timeoutMs?: number })`**
   - `host` has its trailing `/` stripped (`host.replace(/\/$/, '')`).
   - Headers: `Authorization: Bearer <personalApiKey>` and
     `Content-Type: application/json`.
   - `timeoutMs` defaults to `20_000`.
   - **Never log the key.**

2. **`listFeatures(): Promise<Record<string, unknown>[]>`**
   - Follows PostHog's `next` pagination cursor exactly as the Python does:
     start at the feature URL, loop while a `next` URL is present.
   - Keeps only array entries that are plain objects.

3. **`createFeature(params: { key: string; name: string; description: string | null; enabled: boolean })`**
   - Body, **exactly**:
     ```ts
     {
       key,
       name: description || name,   // description wins when non-empty
       active: enabled,
       filters: { groups: [{ properties: [], rollout_percentage: 100 }] },
       evaluation_runtime: 'server',
     }
     ```
   - `POST` to the collection URL.

4. **`updateFeature(featureId: string, params: { key?: string; description?: string; enabled?: boolean })`**
   - Builds the body from only the fields that are **not `undefined`**:
     `key` → `key`, `description` → `name`, `enabled` → `active`.
   - `PATCH` to the item URL.

5. **`deleteFeature(featureId: string): Promise<void>`** — `DELETE` to the item URL.

6. **Private `featureUrl(featureId?: string)`**
   - `` `${baseUrl}/api/projects/${projectId}/feature_flags${featureId ? `/${featureId}/` : '/'}` ``
   - **The trailing slash matters** — PostHog 301-redirects without it.

7. **Private `request(method, url, body?)`**
   - Any thrown network error **or** a non-`ok` response becomes:
     `code: 'provider/posthog-error'`, `message: 'PostHog feature flag request failed.'`, `httpStatus: 502`.
   - A `204` returns `{}`.
   - A body that parses to anything other than a plain object becomes:
     `code: 'provider/posthog-invalid'`, `message: 'PostHog returned an invalid feature flag response.'`, `httpStatus: 502`.
   - **These three code strings are a contract. Reproduce them character for character.**

8. **`getPostHogClient(settings)`**
   - Signature: `getPostHogClient(settings: Settings): PostHogClient` where
     `import type { Settings } from '@/config'`. Read the values from
     `settings.posthog.personalApiKey`, `settings.posthog.projectId`,
     `settings.posthog.host` — **note the nested `posthog` object**; the TS
     config is not flat like the Python one. Check `src/config/index.ts` to
     confirm the field names before writing.
   - If any of the three is missing/empty, throw `AppHttpError` with
     `code: 'provider/misconfigured'`, `httpStatus: 503`, and the message
     `'PostHog feature management is not configured. Set POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, and POSTHOG_HOST.'`
     (one line, single spaces).
   - `projectId` in the TS config may be typed as a string or number — coerce
     with `Number(...)` and treat `0`/`NaN` as missing.

9. **`captureEvent(settings, params: { distinctId: string; event: string; properties: Record<string, unknown> }): Promise<void>`**
   - Best-effort analytics. Uses `settings.posthog.projectApiKey` (the
     **publishable project key**, a different credential from the personal API
     key) against `POST ${host}/capture/`.
   - Returns early, silently, when the project key or host is empty.
   - Body: `{ api_key, event, distinct_id, properties }` where `properties`
     has every `null`/`undefined` value dropped.
   - **Every failure is swallowed**: wrap in try/catch and
     `log.warn({ event: params.event }, 'posthog.capture_failed')`. It must
     never throw — analytics may not affect the request that produced it.

## Verification — run all four, in the foreground, before reporting done

```bash
cd /workspaces/876/apps/api
pnpm node:typecheck
pnpm node:lint
pnpm node:boundaries      # must report 0 errors
npx prettier --check "src/providers/posthog/**/*.ts"
```

If prettier complains, run `npx prettier --write "src/providers/posthog/**/*.ts"`
and re-check. Do not commit anything — the orchestrating agent commits.

## Report back

State, in this order: the two files you created with their line counts, the
output of each of the four verification commands, and anything in the Python
source you could not translate faithfully and why.
