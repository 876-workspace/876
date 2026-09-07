# Implementation Plan: Customers, Items & Customer Contacts CRUD + UI

- **Run ID:** `2026-09-06-customers-items-contacts-crud`
- **Integration branch:** `feature/customers-items-contacts-crud` (cut from `main` @ `b41eb621`)
- **Status:** IN_PROGRESS
- **Scope:** `apps/billing`, `apps/invoice`, `apps/billing-api`, `packages/billing`, `packages/billing-ui`

## Overview

Bring **customers**, **items**, and **customer contacts** to full CRUD with real UI in
the two finance apps (876 Billing and 876 Invoice), and fix the customer detail tab
chrome so the record reads as one card rather than a header with an empty body.

The two apps are one product family: 876 Invoice is a deliberately reduced 876 Billing
over the same financial data plane (`.claude/rules/finance-app-parity.md`). Anything a
shared surface needs goes in `@876/billing-ui` as a **panel**; the apps compose.

## The reported defect

`/customers/[customerId]/edit` renders the tab strip and then nothing. Cause, confirmed:

```ts
// apps/billing/src/app/(app)/customers/[customerId]/edit/page.tsx
// apps/invoice/src/app/(app)/customers/[customerId]/edit/page.tsx
export default function EditCustomerPage() {
  return null
}
```

Both apps ship a `null` stub nested under `[customerId]/layout.tsx`, which renders the
`DetailCard` header + `DetailCardRouteTabs` around it. So the chrome is real and the body
is genuinely empty. Invoice already has a working `CustomerForm` that accepts a `customer`
prop for the edit case — it was simply never wired to the route.

## Verified premises (checked in-tree, do not re-derive)

| Claim                                                        | Evidence                                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Customer CRUD exists end-to-end in the API                   | `apps/billing-api/src/modules/customers/customers.routes.ts` — list/create/retrieve/update/delete |
| Item CRUD exists end-to-end in the client                    | `packages/billing/src/resources/items.ts` — list/retrieve/create/update/delete     |
| `Contact` is modelled but has **no** routes, client, or UI   | `apps/billing-api/prisma/schema/contact.prisma`; no `contacts` path in any `*.routes.ts` |
| `serializeContact` already exists and is the wire shape      | `apps/billing-api/src/modules/customers/customers.serializers.ts:3`                |
| A customer already serializes `primaryContact`               | `customers.serializers.ts:61`                                                     |
| Both apps proxy `customers` + `items` via `[[...path]]`      | `apps/invoice/src/lib/api/resource-manifest.ts`; `apps/*/src/app/api/customers/`   |
| Contacts nest under `/customers/:id/contacts` → **no new app route needed** | the existing customer proxy forwards the sub-path                                 |
| `apps/billing-api` still **throws** registered errors        | `.claude/rules/error-handling.md` "Migration state" — do not half-migrate it       |

That last row matters: `apps/billing-api` is explicitly listed as an unmigrated
throwing service. New code there throws to the central error middleware like its
neighbours; it does **not** introduce a value-returning boundary.

## Phases

| #   | Phase                                          | Delegate                | Files (non-overlapping)                                   |
| --- | ---------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| A   | Customer contacts — API + `@876/billing` client | Codex `gpt-5.6-terra` medium | `apps/billing-api/src/modules/customers/**`, `packages/billing/src/**` |
| B   | Customer edit/delete UI + tab chrome            | Codex `gpt-5.6-terra` medium | `apps/{billing,invoice}/src/app/(app)/customers/**`, `packages/billing-ui/src/**` |
| C   | Items CRUD parity                               | Codex `gpt-5.6-terra` medium | `apps/{billing,invoice}/src/app/(app)/items/**`            |
| D   | Contacts UI (a Contacts tab on the record)      | Codex `gpt-5.6-terra` medium | `apps/{billing,invoice}/src/app/(app)/customers/[customerId]/contacts/**` |
| E   | Docs                                            | `agy` `gemini-3.8-flash-high` | `apps/billing/docs/**`, package READMEs                    |

A, B and C touch disjoint paths and run **in parallel**. D depends on A (it needs the
client resource) and on B (it adds a tab to the layout B rewrites), so it runs after both.
E runs last, against the finished code.

## Design decisions

1. **Contacts are a sub-resource of a customer, not a top-level resource.** A contact has
   no meaning outside the customer it belongs to, its Prisma unique key is
   `(tenantId, customerId)`-scoped, and the registry rule
   (`.claude/rules/customer-architecture.md`) treats a contact as a person *attached to* a
   customer. So: `/api/v1/customers/:customerId/contacts[/:contactId]`, and
   `billing.customers.contacts.*` on the client.

2. **Primary-contact promotion is a server-side invariant, not a client concern.**
   At most one contact per customer may carry `isPrimary`. Promoting one demotes the
   incumbent inside the same transaction — the repository already does exactly this for
   the Core sync path (`customers.repository.ts:386`), and the new write path reuses that
   rule rather than restating it.

3. **A Core-linked contact is not freely editable.** A contact carrying `userId` is a
   snapshot of an 876 account refreshed by `customer.ensure`. Hand-editing its name or
   email would be overwritten on the next sync, so those fields are read-only for a
   linked contact; a hand-entered contact is fully editable. This mirrors the
   demote-never-delete rule already in the repository.

4. **Deleting the last contact of a `CORE_ORGANIZATION` customer is refused.** The
   customer-architecture rule requires a business customer to have a primary contact, and
   the sync would immediately recreate it — a delete that silently reverses itself is worse
   than a refusal.

5. **The tab strip is built from `params` and rendered immediately.** Per
   `.claude/rules/navigation-performance.md` Rule 2 the detail layout awaits `params` and
   nothing else; the record identity streams behind its own `<Suspense>`. Invoice already
   does this; Billing's layout currently awaits `resolveCustomer` in the layout body and
   must be brought into line.

6. **Edit is a page, never a dialog** (`.claude/rules/app-layout.md` §1), and it renders
   inside the record card as a tabbed sibling — the list stays beside it.

## Task checklist

### Phase A — contacts API + client

- [ ] `contacts` sub-resource routes on the customers router (list/create/retrieve/update/delete)
- [ ] `customers.schemas.ts` — contact body/param/list schemas
- [ ] `customers.service.ts` + `customers.repository.ts` — write path with the primary invariant
- [ ] `customers.docs.ts` — OpenAPI prose
- [ ] `packages/billing` — `customers.contacts.*` resource + integration types
- [ ] Tests: ≥ 18 `it()` cases

### Phase B — customer edit/delete UI + tab chrome

- [ ] Billing `edit/page.tsx` renders a real form (replaces the `null` stub)
- [ ] Invoice `edit/page.tsx` renders `CustomerForm` with the loaded customer
- [ ] Billing detail layout: `params` only, identity streamed
- [ ] Tab chrome: overflow scroll, active affordance, no horizontal page scroll
- [ ] Tests: ≥ 14 `it()` cases

### Phase C — items parity

- [ ] Invoice item delete/archive action
- [ ] Billing item actions parity
- [ ] Tests: ≥ 10 `it()` cases

### Phase D — contacts UI

- [ ] `Contacts` tab on the customer record in both apps
- [ ] Add/edit/remove contact, promote to primary
- [ ] Linked-contact fields read-only
- [ ] Tests: ≥ 12 `it()` cases

### Phase E — docs

- [ ] Contacts documented in the billing API docs and package README

## Verification commands

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/billing-ui test
node scripts/check-app-structure.mjs
```

Every one runs in the **foreground** (`.claude/rules/cli.md`).

## Dispatch log

| Phase | Delegate                                    | Brief                                                        | Status      |
| ----- | ------------------------------------------- | ------------------------------------------------------------ | ----------- |
| A     | Codex `gpt-5.6-terra` medium                | `briefs/codex/2026-09-06-phase-a-contacts-api-and-client.md` | dispatched  |
| B     | Codex `gpt-5.6-terra` medium                | `briefs/codex/2026-09-06-phase-b-customer-edit-and-tabs.md`  | dispatched  |
| C     | Codex `gpt-5.6-terra` medium                | `briefs/codex/2026-09-06-phase-c-items-parity.md`            | dispatched  |
| D     | Codex `gpt-5.6-terra` medium                | `briefs/codex/2026-09-06-phase-d-contacts-ui.md`             | written, blocked on A+B |
| E     | `agy` `gemini-3.8-flash-high`               | `briefs/agy/2026-09-06-phase-e-contacts-docs.md`             | written, blocked on A–D |

### Dispatch note — a killed run looks exactly like a refusal

The first dispatch of A/B/C was launched as `nohup codex exec … &` *inside* a
backgrounded Bash call. The harness reported all three "completed, exit 0" within
seconds, and the working tree was untouched — the signature of a Codex refusal.

It was not a refusal. The transcripts were 160 KB+ and ended **mid-file-read**: the
harness reaped the process group as soon as the `nohup … &` wrapper returned, killing
the runs about seven minutes in. Relaunched as a plain foreground `codex exec` under
`run_in_background: true`, letting the harness own the process.

**Do not wrap a delegated CLI in `nohup … &` inside a backgrounded tool call.** Exit 0
plus an empty diff has two very different causes and they are indistinguishable without
checking whether the transcript ends cleanly.

## Handoff state

- Branch cut, plan and all five briefs written. Working-tree changes from the previous
  session (the `CustomerDetailActions` panel in `@876/billing-ui`, the optional `status`
  on `DetailLayout`, the reformatted invoice layout) are **kept** and are the starting
  point for Phase B.
- A, B, C running in parallel. Then D, then E.
- Nothing committed yet — delegates never commit; the orchestrator stages per
  `.claude/rules/git.md` granularity.
