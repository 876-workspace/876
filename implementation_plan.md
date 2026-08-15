# 876 TypeScript camelCase Migration — Implementation Plan

> **Goal:** Eliminate the Python-era snake_case wire convention from all
> 876-owned TypeScript code. The full stack — Prisma → Repository → Service →
> Serializer → Zod schema → Express JSON → SDK → Application — uses camelCase
> end-to-end. Database names and external provider payloads are untouched.

---

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Create integration branch `refactor/ts-camelcase-migration` | ✅ Done |
| 1 | Update rule files (`.claude/`, `.agents/`, `.grok/`, root docs) | ✅ Done |
| 2 | Migrate `@876/core` shared types (`ApiList`, pagination) | ⏳ Pending |
| 3 | Migrate `apps/api` modules one by one | ⏳ Pending |
| 4 | Migrate `apps/couriers-api` modules | ⏳ Pending |
| 5 | Migrate `apps/billing-api` (careful: contract checks) | ⏳ Pending |
| 6 | Migrate SDK packages (`@876/sdk`, `@876/admin`, `@876/core`, client packages) | ⏳ Pending |
| 7 | Migrate application call sites (`apps/876`, `apps/console`, etc.) | ⏳ Pending |
| 8 | Final verification + open main PR | ⏳ Pending |

---

## Integration Branch

```
main
 └── refactor/ts-camelcase-migration   ← integration branch (all phases merge here)
      ├── refactor/camelcase-rules       ← Phase 1: rule files ← current branch
      ├── refactor/camelcase-core        ← Phase 2: @876/core
      ├── refactor/camelcase-api         ← Phase 3: apps/api
      ├── refactor/camelcase-couriers    ← Phase 4: apps/couriers-api
      ├── refactor/camelcase-billing     ← Phase 5: apps/billing-api
      ├── refactor/camelcase-sdk         ← Phase 6: SDK packages
      └── refactor/camelcase-apps        ← Phase 7: app call sites
```

---

## Phase 1 — Rule Files (DONE)

### Files updated

| Rule file | What changed |
|-----------|-------------|
| `naming.md` | Replaced "Public JSON response fields" with TypeScript casing section; added camelCase surface table; added intentional-vs-accidental rename distinction. |
| `express-api.md` | Changed "Wire field names are snake_case" → camelCase. Updated list/pagination examples (`hasMore`, `totalCount`, `startingAfter`, `endingBefore`). Updated Zod schema example. |
| `api-backend.md` | Updated list object contract to camelCase. Updated cursor param names. Replaced casing-freeze rule with coordinated-migration rule. |
| `stripe-api-pattern.md` | Updated `ApiList` and `ApiSearchResult` to camelCase fields (`hasMore`, `totalCount`, `nextPage`). Added note about stable `object` token values. |
| `sdk-conventions.md` | Added **Contract casing** section mandating camelCase end-to-end; prohibits runtime `camelizeKeys()` middleware. |
| `AGENTS.md` | Updated API Contracts: `hasMore`, `totalCount`, `startingAfter`, `endingBefore`. |
| `GEMINI.md` | Same as AGENTS.md. |

All changes mirrored to `.agents/rules/` and `.grok/rules/`.

---

## Phase 2 — `@876/core` shared types

- `packages/core/src/types/api.ts`: `ApiList<T>` fields → `hasMore`, `totalCount`
- Shared pagination query type: `startingAfter`, `endingBefore`
- `packages/core/src/http/envelope.ts` (if present): update list builder helpers

---

## Phase 3 — `apps/api` modules

For each module under `apps/api/src/modules/`:

- `*.schemas.ts` — change all snake_case Zod fields to camelCase
- `*.serializers.ts` — remove casing translation; map row fields directly
- `*.controller.ts` — update destructuring (`userId` not `user_id`)
- `*.routes.ts` — update param names (`:userId` not `:user_id`)
- `*.docs.ts` — update field name examples
- `__tests__/` — update request/response fixtures

Run after each module:
```bash
pnpm --filter @876/api typecheck && pnpm --filter @876/api test
```

---

## Phase 4 — `apps/couriers-api` modules

Same pattern as Phase 3 for all couriers modules.

```bash
pnpm --filter @876/couriers-api typecheck && pnpm --filter @876/couriers-api test
```

---

## Phase 5 — `apps/billing-api` (careful)

Same pattern but must also update:
- `api:contract:check` manifest
- OpenAPI fixture snapshot
- Integration test fixtures

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check
```

---

## Phase 6 — SDK packages

- `packages/sdk/src/types/*.ts` — all resource types to camelCase
- `packages/sdk/src/resources/*.ts` — update parameter names
- `packages/admin/src/client.ts` — update method params and return types
- `packages/core` — update shared type exports
- `packages/billing`, `packages/couriers`, etc.

---

## Phase 7 — Application call sites

TypeScript compiler errors drive discovery. After SDK types update, run:

```bash
pnpm --filter @876/app typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/enterprise typecheck
pnpm --filter @876/couriers typecheck
pnpm --filter @876/billing typecheck
```

Fix all call sites accessing snake_case properties.

---

## Phase 8 — Final verification

```bash
pnpm check   # format + lint + typecheck + test
```

Open one PR: `refactor/ts-camelcase-migration` → `main`.

---

## Canonical surface table (new convention)

| Surface | Convention |
|---------|------------|
| TS variables | camelCase |
| TS functions | camelCase |
| TS object properties | camelCase |
| Zod fields | camelCase |
| 876 JSON request body | camelCase |
| 876 JSON response | camelCase |
| Query parameters | camelCase |
| Express route params | camelCase |
| SDK params/results | camelCase |
| Prisma model fields | camelCase (mapped from DB via `@map`) |
| Type/interface names | PascalCase |
| URL path segments | lowercase/kebab where needed |
| DB tables/columns | **leave unchanged** (snake_case) |
| Environment variables | SCREAMING_SNAKE_CASE |
| External provider payloads | provider's native naming |
| HTTP headers | standard HTTP spelling |
| Migrations/raw SQL | database convention |
| Error codes | stable opaque strings — do not rename |
| Object discriminator tokens | stable values (`'user'`, `'list'`, `'search_result'`) |

---

## What explicitly does NOT change

- Physical database table and column names
- Prisma `@map` / `@@map` attributes (they stay — they bridge DB and TS)
- Environment variable names
- External/provider-owned payloads (WorkOS, Stripe, etc.)
- Standard HTTP header names
- Error code strings
- `object` discriminator token values (e.g. `'search_result'`, `'payment_intent'`)
- Python service internals (keep snake_case; normalize at the TS client boundary)
- No runtime `camelizeKeys()` middleware — contracts are explicit Zod schemas
