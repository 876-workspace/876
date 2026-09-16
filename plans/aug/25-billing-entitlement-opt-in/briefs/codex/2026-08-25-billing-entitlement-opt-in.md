# Brief — 876 Billing is no longer a default org entitlement

## The decision

Today every new organization is auto-provisioned onto **two** apps:
`876-enterprise` **and** `876-billing` (`DEFAULT_ORG_APP_SLUGS` in
`apps/api/src/services/provisioning.ts`). The product decision has changed:

> An organization must **not** receive an automatic entitlement to the 876
> Billing application (nor 876 Invoice). Accessing those applications requires
> activating a subscription explicitly.

**Critically, this is an _application entitlement_ change only.** The shared
financial data plane is untouched: the org still gets its Billing _customer
registry_ record, dependent products (Couriers, Invoice) still get their
embedded finance workspace through `financeDependency: 'embedded'`
provisioning, billing details are still stored centrally. What changes is that
being able to _open the 876 Billing app_ now requires its own subscription.

Two decisions already made — do not revisit:

1. **The source-app grant stays.** The app whose validated API key the signup
   came through (`sourceAppId`) is still provisioned. Only the _default set_
   shrinks. Nobody signs up "through" Billing, so Billing is now never
   auto-granted.
2. **No data migration.** Organizations that already hold an auto-provisioned
   `876-billing` subscription keep it. Do not write a backfill, a revoke
   script, or a migration.

## Scope

Three phases, all in one branch (`feat/billing-entitlement-opt-in`, already
checked out). Do **not** commit — the orchestrator stages and commits.

---

### Phase A — Core API: shrink the default set

`apps/api`

1. `src/services/provisioning.ts`
   - `DEFAULT_ORG_APP_SLUGS` becomes `[ENTERPRISE_APP_SLUG]`.
   - Keep the `BILLING_APP_SLUG` export (other modules/tests import it), but
     rewrite its docblock: it is the slug of the Billing application, which an
     organization now activates deliberately; it is _not_ a default. Explain in
     one or two sentences **why** — the org keeps its financial data plane
     (customer registry record, embedded-finance workspaces opened by dependent
     products) without an entitlement to the Billing _application_.
   - Update the file-level docblock (point 1 currently says "an active
     subscription to the default apps" and implies Billing).
   - `enqueueCustomerEnsure` / `defaultEnqueueCustomerEnsure` must keep running
     for every organization exactly as today. This is the shared registry and
     is deliberately independent of app entitlements. Do not gate it on a
     Billing subscription.
2. `src/modules/organizations/organizations.docs.ts` —
   `BOOTSTRAP_ORG_DESCRIPTION` says "plus Enterprise and Billing app
   entitlements". It must now name Enterprise only.
3. Comment sweep: `src/services/finance-provisioning-readiness.ts` (~line 142)
   and `src/modules/organizations/organizations.service.ts` (~line 1216) list
   `876-billing` as a non-finance app — those statements are still true, leave
   the substance, but do not let any comment claim Billing is a default
   entitlement. Grep for "default" + "billing" before you finish.
4. Tests:
   - `src/modules/organizations/__tests__/bootstrap-docs-advanced.test.ts`
     currently asserts `DEFAULT_ORG_APP_SLUGS` **contains** `BILLING_APP_SLUG`.
     Invert it: it must contain `ENTERPRISE_APP_SLUG` and must **not** contain
     `BILLING_APP_SLUG` or `'876-invoice'`. Keep the doc-description assertions
     consistent with the new copy.
   - `src/services/__tests__/provisioning.test.ts` and
     `provisioning-advanced.test.ts`: update every expectation that assumes two
     default apps. Add a regression test proving that provisioning a new
     organization (a) creates **no** `876-billing` subscription, and (b) still
     enqueues the billing `customer.ensure` — the two halves of this change,
     asserted together, so a future refactor cannot re-couple them.
   - Add a test that the source app is still provisioned when `sourceAppId` is
     supplied and is not in the default set.

---

### Phase B — Billing app: enforce the entitlement, with a working way in

`apps/billing`

Right now `src/lib/auth/billing-context.ts` hardcodes `accessStatus: 'active'`
(commit `0eb30a02`) precisely because Couriers-provisioned workspaces had no
Billing subscription and members were locked out. That workaround is now the
thing to remove — but the recovery path must be real, per
`.claude/rules/product-org-signup.md`: **a missing entitlement is a setup step
for an owner/admin, never a wall.**

5. `src/lib/auth/billing-context.ts`
   - Resolve the real entitlement with
     `platform.subscriptions.retrieve({ organizationId, appSlug: BILLING_APP_SLUG })`
     (see `apps/invoice/src/lib/auth/context.ts` for the identical pattern).
   - Map status → `AccessStatus`: `active` | `trialing` → `'active'`;
     `'blocked'` → `'blocked'`; **everything else, including a missing
     subscription, a 404, or a request error → `'none'`**. Note the deliberate
     divergence from Invoice's mapping: a `canceled`/`past_due` subscription
     must stay re-activatable by an owner, so it must not be reported as
     `blocked` (which is the "876 has restricted this" answer). Put that
     reasoning in a comment.
   - A transport failure resolving the subscription must degrade to `'none'`
     (a setup prompt), never to `'active'`. Failing open on an entitlement is
     the one outcome this change exists to prevent.
   - Replace the now-false "Platform subscription state must not block
     enterprise members" comment with the current rule: workspace membership
     governs _what you can do inside_ the workspace; the platform subscription
     governs _whether the Billing application opens at all_.
6. `src/app/(app)/layout.tsx` — after the existing `!context.tenant` branch,
   gate on the entitlement:
   - `accessStatus === 'blocked'` → `/no-access` for every role, owner included.
   - otherwise `accessStatus !== 'active'` → `'/get-started'` for
     `owner`/`admin`, `/no-access` for `member`.
     Keep the decision in one place: the layout redirects, `/get-started` decides.
7. `src/app/get-started/page.tsx`
   - `if (context.tenant) redirect('/')` is now a redirect loop for an org whose
     workspace exists (opened by Couriers) but which has no Billing entitlement.
     Redirect to `/` only when `context.tenant && context.accessStatus ===
'active'`.
   - `accessStatus === 'blocked'` → `/no-access`.
   - When the workspace already exists but the entitlement does not, render an
     **activation** card, not the workspace-creation card: different title/copy
     ("Activate 876 Billing" / it explains the org's financial data already
     exists and this turns on the application), same `SetupButton` with
     `workspaceExists` true. Honour `CLAUDE.md` → UI Copy: short, no restating
     the obvious.
8. `src/app/get-started/_components/setup-button.tsx` — today an existing
   workspace short-circuits straight to `/` **before** activating, so the
   activation can never happen. Fix the order: always `POST /api/activate`
   first; create the tenant only when `!workspaceExists`; then navigate.
9. `src/app/api/activate/route.ts` — the `blocked` and `already active`
   branches now genuinely reachable; verify they still read correctly and that
   the route authorizes owner/admin only. Change only what is wrong.
10. Tests:
    - `src/lib/auth/billing-context.test.ts`: restore subscription mocking and
      cover active, trialing, blocked, canceled, missing subscription, and a
      failed subscription request (→ `'none'`, never `'active'`).
    - Add coverage for the get-started branch selection (workspace exists +
      not entitled → activation card, not a redirect) and for the setup button
      calling activate before navigating. Follow `.claude/rules/testing.md`:
      exact assertions, negative-space tests, no `toBeDefined()`.

---

### Phase C — Documentation

11. `docs/org-provisioning.md` — the default-set table drops the `876-billing`
    row and gains a short section explaining the split: entitlement (per app,
    explicit) vs the shared financial data plane (registry record + embedded
    finance workspaces, automatic). The file also still describes the deleted
    Python implementation (`services/auth.py`, `provision_org_apps`,
    `DEFAULT_ORG_APP_SLUGS: tuple[str, ...]`); correct those references to the
    Express/TypeScript reality while you are in the file.
12. `.claude/rules/platform-services.md` — the paragraph stating every org
    receives `876-enterprise` + `876-billing` must be rewritten. **Mirror the
    same edit into `.agents/rules/platform-services.md` and
    `.grok/rules/platform-services.md`** (all three trees, per `CLAUDE.md`).
13. `.claude/rules/billing-data-plane.md` (+ both mirrors) — add a short rule
    under placement: an organization's finance data plane is automatic; an
    entitlement to the 876 Billing _application_ is not, and must be activated.
14. `docs/architecture/012-ecosystem-sync-and-deletion-lifecycle.md` — correct
    any statement that Billing is a default entitlement.

Do not touch `apps/invoice`, `apps/couriers`, or `apps/console` behaviour.

## Verification (you run these; do not report done without them)

```
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
```

(Confirm the billing workspace's exact package name in `apps/billing/package.json`
before running.) Report the real output of each. Do not commit, do not push, do
not create a branch.

## Rules to read first

`.claude/rules/product-org-signup.md`, `.claude/rules/platform-services.md`,
`.claude/rules/billing-data-plane.md`, `.claude/rules/express-api.md`,
`.claude/rules/testing.md`, `.claude/rules/code-style.md`.
