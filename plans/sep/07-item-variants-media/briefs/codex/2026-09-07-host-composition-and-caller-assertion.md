# Codex Brief — Host composition for item variants/media, and the resource-link caller assertion

**Run:** `plans/2026-09-07-item-variants-media`
**Branch:** `feature/item-variants-media` (already checked out — do NOT create, rename, merge, rebase, or delete any branch)
**Model:** gpt-5.6-terra, high reasoning

## Where the branch stands

Everything below the UI is done and **verified green by the orchestrator**: the Billing API domain,
the migrations (applied), the `@876/billing` and `@876/storage` contracts, both hosts' `/api` BFF
routes, and three shared panels in `@876/billing-ui`
(`item-option-builder-panel`, `item-variants-panel`, `item-media-panel`) with 15 passing tests.

A previous Codex run built those panels but reported, honestly, that it did **not** compose them
into the hosts. This brief finishes exactly that, plus one security follow-up.

Current suite state — **all green**, so any failure you see is yours:

```
billing-api 634 · billing 288 · storage 391 · billing-ui 337 · billing-app 858 · invoice-app 346 · storage-api 540
```

## Task 1 — `@876/storage` resource links must send the caller assertion

**This is a correctness bug that will break media detach in production, and it is the higher
priority of the two tasks. Do it first.**

The orchestrator hardened `apps/storage-api`'s resource-link routes: `create`, `list`, and `delete`
now authorize against the **file owner** via the files domain's authorization module, because the
shared internal key proves only that *some* 876 service is calling — never that it may touch a
given file. The assertion travels in headers: `x-876-source-app-id`, `x-876-actor-user-id`,
`x-876-actor-org-id`.

`packages/storage/src/resources/files.ts` already does this — see its `callerHeaders()` helper and
`FileCallerAssertion`. **`packages/storage/src/resources/resource-links.ts` does not send them at
all.** As a result:

- `delete` will now always 404 — detaching an item image cannot work;
- `list` will return an empty list for any non-public file;
- `create` will 404 for any non-public file.

Fix it by **reusing the existing pattern, not inventing a second one**
(`.agents/rules/ai-code-quality.md`): give `create`, `list`, and `delete` a caller assertion
parameter of the same shape `files.ts` uses, and serialize it through the same header helper. If
that means lifting `callerHeaders` and the assertion type to a shared module inside the package so
both resources use one copy, do that — do not duplicate the function.

Then update every call site on this branch that uses `resourceLinks.*`, in
`apps/billing/src/lib/services/storage.ts`, `apps/invoice/src/lib/services/storage.ts`, and the
`/api/item-media/**` route handlers, so each passes the acting app id and the acting organization
(and user where known). The route handler already authorizes the session — that is where the real
actor comes from; **never** take the actor from the request body.

**Tests: ≥ 6 new `it()` cases** in `packages/storage`, asserting the exact headers sent by each of
the three operations (`toHaveBeenCalledWith`, exact header object), mirroring the style of
`packages/storage/src/client.test.ts`.

## Task 2 — compose the shared panels in Billing and Invoice

The previous run reported it could not find a host upload surface. **It exists on this branch** —
it simply was not found:

```
apps/billing/src/app/api/item-media/uploads/route.ts
apps/billing/src/app/api/item-preferences/[[...path]]/route.ts
apps/billing/src/app/api/item-variants/[[...path]]/route.ts
apps/invoice/src/app/api/item-media/uploads/route.ts
apps/invoice/src/app/api/item-preferences/[[...path]]/route.ts
apps/invoice/src/app/api/item-variants/[[...path]]/route.ts
```

Read those first, plus each host's `src/lib/services/storage.ts` and its typed browser client under
`src/lib/client/`. Use them. If a specific verb is genuinely missing from a host's browser client,
**add it to that client** — that is in scope; what is not in scope is a second transport, a direct
`fetch` from a component, or a server action.

Compose, in **both** Billing and Invoice, at parity:

1. **Item create** — the option builder, rendered only when the server-resolved `product-variants`
   preference is on. Invoice already does this; give Billing the same.
2. **Item edit / detail** — the variants panel and the media panel.
3. **Item settings** — a `product-variants` preference toggle wired to the preferences route.
4. **Media upload** — wire the panel's `onStartUpload` / `onCompleteUpload` callbacks to the host's
   `/api/item-media/uploads` route. A failed *complete* must be retryable without re-uploading the
   bytes; the panel already supports that, so do not break it.

Billing's item screens use an older server-loaded `CreateForm` / `service` implementation. Extending
it is fine; **replacing it wholesale is not** — keep the change proportionate, and do not weaken a
signature or drop a `ResourceToolbar` to make composition easier.

**Tests: ≥ 4 new `it()` cases per host** (Billing and Invoice, ≥ 8 total): the preference off hides
variant authoring, the preference on reveals it, the create flow submits the expected payload, and
both hosts render the same variant/media state. Check each app's `vitest.config.ts` **environment**
before writing a component test — a suite written for the wrong environment never executes.

## Your file scope

You may edit `packages/storage/**`, `packages/billing-ui/**`, `apps/billing/**`, `apps/invoice/**`,
and your own report. Do **not** touch `apps/storage-api/**` or `apps/billing-api/**` — both are
verified green and their frozen contracts are settled.

## Hard constraints

- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`.
- No server actions; no `fetch` or Storage URL inside a `@876/billing-ui` panel; no hard-coded href
  in a panel; no branch on the host's name inside a panel — a host difference is a **prop**.
- No green buttons. No explanatory `<p>` under a heading.
- **Do not commit.** The orchestrator stages and commits.
- Read first: `.agents/rules/finance-app-parity.md`, `.agents/rules/shared-product-ui.md`,
  `.agents/rules/app-layout.md`, `.agents/rules/app-structure.md`, `.agents/rules/data-loading.md`,
  `.agents/rules/storage-architecture.md`, `.agents/rules/api-access.md`,
  `.agents/rules/testing.md`, `.agents/rules/ai-code-quality.md`.

## Verification — run these and report the real output

```bash
pnpm --filter @876/storage typecheck && pnpm --filter @876/storage test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

`pnpm --filter @876/billing-app lint` and `@876/invoice-app lint` each report 10 pre-existing errors
that are identical on `main` — do not fix them, and do not add to them.

## Report

Write `plans/2026-09-07-item-variants-media/reports/codex/2026-09-07-host-composition.md`: what you
composed on each screen in each host, the **counted** `it()` cases per file, the resource-link
header change and its call sites, anything you left undone, and the full verification output. A
truthful "not done" beats a confident claim.
