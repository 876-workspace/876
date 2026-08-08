# Brief — port the phone/user-agent primitives and the Twilio + PostHog adapters

**Tool:** `agy --model=claude-sonnet-4-6 --effort=high`
**Branch:** `feat/api-express-foundation`
**Reviewed by:** primary agent — every file read, all checks re-run in the foreground

## Why this is delegated

These four units are **leaf code with no callers yet**: pure parsing, HTTP
transport, and error mapping. None of them touches credentials-in, routing, or
authorization. The security-sensitive half of this batch — field encryption, PIN
hashing, rate limiting, risk scoring, and the WorkOS adapter — is being written
by the primary agent in parallel and is **out of scope for you**.

## Read first

1. `.claude/rules/express-api.md` — sections "The shape", "Layer
   responsibilities", "Configuration", "Logging and observability", "Security
   baseline", "Do not". This is the contract.
2. `apps/api/src/platform/timestamps.ts` and `apps/api/src/platform/ids.ts` —
   the shape a platform primitive takes: named exports, no classes, a header
   comment saying _why_ the module exists, no I/O at import time.
3. `apps/api/src/platform/jwt.ts` — a platform module that does read config and
   cache; note how it gets settings (`getSettings()` from `@/config`) and logs
   (`getLogger()` from `@/platform/logger`, structured `log.warn({fields},
'event.name')`).
4. `apps/api/src/http/errors.ts` — `AppHttpError`. Provider errors are
   normalised into this **before** they cross out of a provider directory.

## The four units

| #   | Python source                                | TypeScript target                                                                             |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | `apps/api/core/phone.py` (45 lines)          | `apps/api/src/platform/phone.ts`                                                              |
| 2   | `apps/api/core/user_agent.py` (209)          | `apps/api/src/platform/user-agent.ts`                                                         |
| 3   | `apps/api/providers/twilio/*.py` (585)       | `apps/api/src/providers/twilio/{client,adapter,errors,types,fake,signatures}.ts` + `index.ts` |
| 4   | `apps/api/providers/posthog/client.py` (185) | `apps/api/src/providers/posthog/{client,errors}.ts` + `index.ts`                              |

Port **behaviour for behaviour**. Same function boundaries, same return shapes,
same error codes, same defaults, same edge cases. Where the Python looks wrong,
port it as-is and list it in your report — do not fix it silently.

## Hard rules

1. **TypeScript, ESM, `strict`.** No `any`. No non-null `!` assertions. Every
   exported function has an explicit return type.
2. **`camelCase` in TypeScript.** Where a Python function returns a dict with
   `snake_case` keys that ends up on the wire, keep the wire key `snake_case`
   and note it in a comment; internal names are `camelCase`.
3. **Never read `process.env`.** Config comes from `getSettings()` in
   `@/config`. If a setting you need is missing from the settings object, stop
   and report it — do not add it yourself.
4. **`fetch` for HTTP** — no axios, no node-fetch, no vendor SDK. Do not add a
   dependency for any reason. Every outbound call carries an explicit timeout
   via `AbortSignal.timeout(ms)`.
5. **Never log a credential.** No auth token, API key, phone number, or full
   request body in a log line. Log the event name, the status code, and a
   non-reversible identifier.
6. **Provider errors are normalised in `providers/<vendor>/errors.ts`** into
   `AppHttpError` with a stable `code` and a **user-safe** `message`. A raw
   vendor message, stack, or payload must never reach the message field.
7. **`providers/` may not import from `src/modules/` or `src/http/`**, except
   `@/http/errors` for `AppHttpError`. `platform/` may not import a module
   either. dependency-cruiser enforces both.
8. **Webhook signature verification** (`providers/twilio/signatures.ts`) must
   compare with `crypto.timingSafeEqual`, never `===`, and must operate on the
   **raw** body. Port the algorithm exactly.
9. **No side effects at import time.** No client constructed, no network call,
   no key loaded at module scope — export a factory or a lazily-initialised
   accessor, as `platform/jwt.ts` does.

## Do not touch

- Any `.py` file (read them; never edit them).
- `src/platform/{crypto,pin,rate-limit,risk}.ts` — the primary agent is writing
  these right now. Creating them will collide.
- `src/providers/workos/**` — same.
- `src/modules/**`, `src/http/**`, `src/db/**`, `src/config/**`.
- `src/http/routes.ts`, `prisma/**`, `package.json`, `tsconfig.json`, the
  lockfile, `.dependency-cruiser.cjs`.
- Do not commit. The primary agent stages and commits.

## Verify before reporting done

From `apps/api`, in the foreground, all four:

```bash
pnpm node:typecheck
pnpm node:lint
npx prettier --check "src/**/*.ts"
pnpm node:boundaries      # must stay at 0 errors
```

`no-orphans` **warnings** are expected — nothing imports these yet. Zero
_errors_ is the bar. Run `npx prettier --write` on the files you created to fix
formatting.

## Report

For each of the four units: every exported symbol with its signature, anything
in the Python you judged wrong but ported as-is, any setting you needed that
`getSettings()` does not expose, and the exact output of the four commands.
