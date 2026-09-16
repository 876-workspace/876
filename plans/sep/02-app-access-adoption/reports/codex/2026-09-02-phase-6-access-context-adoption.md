# Phase 6 report — one AccessContext per request in CRM and Invoice

**Delegate:** codex `gpt-5.6-terra`, high effort. **Reviewed and completed by the orchestrator.**

Codex produced the phase but never wrote a report, so this file is the
orchestrator's record of what landed, what was wrong, and what was changed.

## What landed

| File | Purpose |
| ---- | ------- |
| `packages/account/src/account.ts` | expose `appMemberships` on the client factory |
| `apps/{crm,invoice}/src/lib/services/account.ts` | request-scoped account client |
| `apps/{crm,invoice}/src/lib/services/platform-app.ts` | resolve this app's platform app id from the org entitlement |
| `apps/{crm,invoice}/src/lib/auth/access-context.ts` | one `AccessContext` per request |
| `apps/crm/src/lib/auth/require-crm-context.ts`, `apps/invoice/src/lib/auth/guards.ts` | `requireAppPermission` |
| `apps/{crm,invoice}/src/components/shell/nav-config.ts` | `defineNavigation` with `requires.permission` |
| `apps/{crm,invoice}/src/components/shell/{shell,sidebar,topbar-search}.tsx` | render server-resolved navigation |
| 18 route files across both apps | `requireAppPermission` guards |
| `apps/invoice/src/components/shell/nav-dropdown.tsx` | deleted — flat registry, no caller |

Tests: CRM 39 files / 309 `it()`, Invoice 25 files / 213 `it()`, API 109 / 2210.

## Defect found in review — the phase shipped a hard-coded app id

`access-context.ts` called the self-membership endpoint with a literal
`app_876-crm` / `app_876-invoice`. Platform app ids are generated per
environment with the `rap` prefix (`apps/api/src/platform/ids.ts:75`); the real
ids are `rap_e39dc360…` and `rap_6a7b9118…`. Every request therefore 404'd,
every context resolved `unavailable`, and — because `(app)/layout.tsx` renders
a banner **in place of** `children` on an outage — **every page in both apps was
replaced by "Access could not be verified"**. Reported live by the user against
876 Invoice before this review completed.

Codex had itself written the correct resolver, `services/platform-app.ts`, with
a docblock explaining precisely why a constant is wrong — and then never wired
it in, leaving the constant it argues against. The resolver is now the only
path; the constants are deleted.

Verified against the live API:

```
GET /organizations/org_fa2c…/apps/by-slug/876-invoice
→ "app_id": "rap_6a7b9118f4644fd7897ec9ad303445d7"
```

and against the database: the organization holds an active invoice
entitlement, an active assignment to the `super-admin` app role, and that role
carries all 26 catalog permissions. Nothing downstream was wrong.

Regression coverage added per app: an unresolved app id reports `unavailable`
and never asks for a membership, and the id is resolved from the entitlement
with the organization id.

## Second defect — the binding test could not fail

Both `nav-config.test.ts` files asserted the registry against a hand-written
`routePermissions` map. `.claude/rules/access-control.md` requires the binding
test to compare the registry against **the permission its destination route
actually checks**; a hand-maintained copy drifts silently, which is the failure
the rule exists to prevent.

Both now read the guard back out of the route file on disk. Proven to fail:
changing `items/layout.tsx` to guard `customers.view` produced
`expected 'items.view' to be 'customers.view'`, and the assertion was restored.

## Third defect — the API test suite was not run

Three API tests failed on the working tree Codex left. Two were `toEqual`
shape assertions that correctly caught `ensureOrgAppSubscriptions` gaining a
field; one encoded the *old* template-fallback rule. See the provisioning
commit — the corrected rule keys the fallback on whether a manifest actually
selected roles, because no manifest names any today and the previous rule left
every setup-provisioned organization with no assignable app role at all.

## Judgement calls

- Invoice `/expenses` and `/time-tracking` guard on `settings.view`. The
  catalog has no key of their own, and inventing one is a catalog change
  outside this phase. Registry and route agree, which is what the binding rule
  requires.
- `(app)/layout.tsx` keeps chrome and shows a notice on an outage rather than
  redirecting — an outage is not an authorization answer. It does replace
  `children`, which is stricter than `.claude/rules/error-handling.md` prefers;
  left as-is because every page below it guards independently and would
  redirect to `/unavailable` anyway.
