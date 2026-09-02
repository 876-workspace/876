# Brief — port services/finance_provisioning.py services/billing_customer_sync.py to Express/TypeScript

**Working directory:** `/workspaces/876/apps/api`

## The goal

Port the Python service(s) `services/finance_provisioning.py services/billing_customer_sync.py` to `src/services/finance-provisioning.ts src/services/billing-customer-sync.ts`, behaviour-identical,
plus a Vitest suite for each under `src/services/__tests__/`.

Read the Python source in full first, including every repository and
model it touches (`apps/api/db/repositories/`, `apps/api/db/models/`)
and the matching Prisma models in `apps/api/prisma/schema/`.

## Files you may create

- `src/services/finance-provisioning.ts src/services/billing-customer-sync.ts`
- a matching `src/services/__tests__/<name>.test.ts` for each
- a `src/services/<name>.repository.ts` for each, **only if** the
  service needs database access

## Files you must NOT touch

Anything else. Other agents are writing `src/services/provisioning.ts`,
`src/services/auth-telemetry.ts`, `src/services/identification-secrets.ts`,
`src/services/auth.ts` and every other `src/services/*` file concurrently.
Do not edit `src/http/**`, `src/modules/**`, `prisma/**`, or any `.py` file.

## Read these first

1. `.claude/rules/express-api.md` — the contract this service is built to.
2. `apps/api/src/services/identity-sync.ts` — **the worked example for a shared
   service.** Copy its shape exactly: it takes the narrow provider/repository
   surface it needs as a typed parameter rather than importing an adapter, so a
   test drives it without standing up the vendor.
3. `apps/api/src/services/__tests__/identity-sync.test.ts` — the test shape.

## Conventions you must not get wrong

- **Only a `*.repository.ts` may import `@/db/client`.** `dependency-cruiser`
  fails the build otherwise. A shared service that needs the database takes a
  repository-shaped parameter, or lives beside a small `<name>.repository.ts`
  in `src/services/`.
- **Timestamps are Unix seconds**; every timestamp column is Prisma `BigInt`.
  Convert with `fromDbUnixSeconds` / `BigInt(nowUnixSeconds())`.
- **Error `code` strings are the contract.** Use the exact string the Python
  raises, character for character. Throw `AppHttpError` from `@/http/errors`.
- **Wire fields `snake_case`, TypeScript `camelCase`.**
- **Python's `int()` / `float()` raise where JavaScript coerces.** `Number(' ')`
  is `0` and `parseInt('4x')` is `4`; Python raises on both. Any numeric parse
  of external data needs an explicit format check.
- Prisma refuses plain `null` on a nullable `Json` column — use `Prisma.DbNull`,
  and keep that detail inside the repository.
- No barrel re-exports. British-neutral comments explaining _why_, not _what_.

## Tests

Vitest, beside the source in `src/services/__tests__/`. Per exported function:
the happy path with a full assertion, every error branch asserting the **exact**
error code, and every idempotence/retry path. Freeze the clock with
`vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(NOW * 1000)` if any
fixture is time-relative — against the real clock a frozen `NOW` fixture is
already in the past. Do not stack `mockResolvedValueOnce` values you do not
consume: `clearMocks` does not drain the once-queue and leftovers leak into the
next test.

## Verification

You cannot run commands in this container (bubblewrap fails). Do not claim you
ran them. Write carefully; the orchestrator runs typecheck, lint, test,
boundaries and prettier and fixes what you missed. Do not run `git commit`.

## When done

Report the functions you ported, anything ambiguous and what you chose, and
anything you could not do.
