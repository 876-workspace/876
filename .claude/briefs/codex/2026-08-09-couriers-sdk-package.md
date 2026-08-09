# Brief — `packages/couriers`, the couriers product SDK

`apps/couriers-api` now exists and serves the `tenants` module. This task builds
the typed client that every future couriers consumer talks to: the customer
portal, the counter kiosk, the driver app, the warehouse app, and Console.

Do not commit, branch, or push.

## Read first, in full

- `.claude/rules/sdk-conventions.md` — the whole file, especially "The model:
  one DX, tiered surface", "Package anatomy", and "Future product apps & SDKs".
  It already specifies this package; you are implementing a written decision,
  not designing one.
- `packages/billing/` — the working reference. Its `package.json` exports,
  `src/integration/{client,request,runtime,resources,types}.ts`, and
  `src/admin/`. **Copy its shape.** Where this brief and `packages/billing`
  disagree, follow `packages/billing`.
- `packages/core/src/client/` — the shared runtime: `resolveClientBaseUrl`,
  `sendClientRequest`, `toCursorQuery`. Build on it; do not reimplement transport.
- `apps/couriers-api/src/modules/tenants/` — the contract you are wrapping.

## The shape

`packages/couriers`, package name `@876/couriers`, with three subpath exports
mirroring `packages/billing`:

| Subpath                     | Credential                    | Consumer                        |
| --------------------------- | ----------------------------- | ------------------------------- |
| `@876/couriers`             | app API key / session         | portal, kiosk, driver app       |
| `@876/couriers/integration` | service key, service-to-service | other 876 services            |
| `@876/couriers/admin`       | `x-internal-key`, server-only | Console (`$couriers` singleton) |

**The rule that keeps this from becoming unmanageable: these packages carry
contracts and transport only, never behavior.** A resource method is a ~5-line
declaration over the tier's request layer. Business logic lives in
`apps/couriers-api`. If you find yourself writing a conditional that encodes a
courier rule, it is in the wrong package.

## What to build

1. **`package.json`** — `exports` for `.`, `./integration`, `./admin`, each
   pointing at `src/<name>/index.ts` with `types` and `default`, exactly like
   `packages/billing/package.json`. Same devDependencies and scripts
   (`typecheck`, `lint`, `test`).

2. **Per-tier request layers** — `src/<tier>/request.ts`, each attaching its own
   credential header and shaping errors with its own code namespace
   (`couriers/*`). Mirror `packages/billing/src/integration/request.ts`.
   **A tier with no credential configured must fail closed before making a
   request**, returning an error like billing's `billing/integration-not-configured`
   — never fall through to an unauthenticated call.

3. **Resource factories** — `src/<tier>/resources/tenants.ts` exporting
   `createTenantsResource(runtime)` returning `{ retrieve, retrieveByOrgId }`,
   and on the admin tier also `list`. Verb names come from the vocabulary in
   `sdk-conventions.md`: `create`, `retrieve`, `update`, `delete`, `list`,
   `search`, and `retrieveBy<Key>` for an alternate-key lookup. **`findBy*`,
   `getBy*`, and bare `get()` are banned.**

4. **Zod response schemas** in `src/<tier>/types/tenant.schema.ts`, validating
   what the API actually returns — including the `object: 'tenant'`
   discriminator. A response that does not conform returns a
   `couriers/invalid-response` error rather than being passed through.

5. **`client.ts` per tier** — pure composition: build the runtime once, pass it
   to each resource factory. The surface of a tier is exactly the factories it
   composes, so an admin verb cannot be imported from the consumer entry point.

6. **Console wiring** — add a `$couriers` singleton at
   `apps/console/src/lib/couriers.ts`, `import 'server-only'`, built from
   `create876CouriersAdminClient`, alongside the existing `$876`. Do **not**
   merge couriers resources into the `$876` namespace; separate singletons keep
   versioning and credentials per product.

## Out of scope

- **Do not** change `apps/couriers`. Swapping its `service.*` call sites to
  `$couriers.*` is a later task, and doing it here would make this
  unreviewable.
- Any resource other than `tenants`.
- Publishing, versioning, or changelog.

## Tests

Follow `.claude/rules/testing.md`, and mirror
`packages/billing/src/integration/client.test.ts`:

- each tier sends its own credential header and **not** the others' — assert the
  headers object does not have the keys it should not;
- a tier with no credential fails closed and `fetch` is never called;
- path parameters are URL-encoded;
- a malformed response yields `couriers/invalid-response` with `data: null`;
- a successful response returns the parsed body with `error: null`.

Assert both sides of every `{ data, error }`.

## Verify

```bash
cd /workspaces/876/packages/couriers
pnpm typecheck && pnpm lint && pnpm test
cd /workspaces/876/apps/console && pnpm typecheck
```

If pnpm refuses over a workspace dependency check, add
`--config.verifyDepsBeforeRun=false`. Report the real output of each command.
