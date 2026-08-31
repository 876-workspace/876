# Brief — close out the bounded-client migration

Branch: `refactor/bounded-service-clients`, already checked out. **Do not create a
branch, commit, rebase, merge, or open a pull request.** Leave everything in the
working tree.

## How this brief differs from the last one

Your previous pass finished the *shape* of the migration — every `@876/client`,
`@876/sdk`, `@876/admin` and `@/lib/876` reference is now gone from all seven
apps. Thank you; that part is done and you must not undo it.

But you wrote it blind, and it left **204 type errors in Console** (19 of them
syntax errors that were hiding the other 185) and **29 in Couriers**. The
orchestrator has since fixed all of Couriers and 128 of Console.

**This brief is different: you are not being asked to work anything out.**
Every remaining error is listed below with its exact, already-verified fix. The
orchestrator read each package's real source to confirm every target on this
list. Apply them literally. Where this brief and your own inference disagree,
**this brief is right** — it was checked against a compiler and you cannot run
one.

You still cannot run any command in this container (`bwrap` cannot create a
namespace, so every `pnpm` / `tsc` / `prettier` call fails). So:

- **Never write that a check passed.** Write "not executed; verification is the orchestrator's".
- Do not estimate test results or write "should pass".
- If a file does not look the way this brief describes, **stop and report that file** rather than improvising.

The exact current error list is committed beside this brief at
`.claude/briefs/muse/2026-08-31-console-errors.txt` (76 lines). Work from it.

---

## Part 1 — Console: the 76 remaining errors

All paths below are relative to `apps/console/`.

### 1a. Provisioning verb names (12 errors)

`workspace.provisioning` has **no** `draft` or `catalog` property. The real
resource (`packages/platform/src/resources/provisioning.ts`) exposes exactly:

```
retrieve  retrieveCatalog  retrievePublished  replaceDraft  publish  validate  runs  setups  notes
```

Apply:

| Wrong | Correct |
| --- | --- |
| `workspace.provisioning.draft(` | `workspace.provisioning.replaceDraft(` |
| `workspace.provisioning.catalog(` | `workspace.provisioning.retrieveCatalog(` |

Files: `src/app/(app)/apps/[slug]/provisioning/page.tsx` (lines 27, 28),
`src/app/(app)/settings/orgs/provisioning/[setupKey]/page.tsx` (14, 15),
`src/app/api/apps/[appId]/provisioning/route.ts` (14, 36),
`src/app/api/apps/[appId]/provisioning/publish/route.ts` (13),
`src/app/api/apps/[appId]/provisioning/validate/route.ts` (17),
`src/app/api/organizations/provisioning/setups/[setupKey]/draft/route.ts` (24),
`src/app/api/organizations/provisioning/setups/[setupKey]/publish/route.ts` (16),
`src/app/api/organizations/provisioning/setups/[setupKey]/validate/route.ts` (24).

Do not change the arguments — only the verb name.

### 1b. App-access resources are top-level on `workspace`, not under `.apps` (9 errors)

`workspace.apps` is the **app registry** (`list`, `retrieve`, `create`,
`update`, `delete`) plus exactly two extras: `features` and `entitlements`.
Everything else you nested under `.apps` is a sibling at the top level of
`workspace` (confirmed in `packages/workspace/src/operator.ts`, whose full key
set is: `addresses appAssignments appMemberships appPermissions appRoles apps
billingAccounts contacts departments employees entitlements features invites
locations members memberships modules onboarding organizationFeatures
organizations orgAppRoles permissions provisioning roles`).

| Wrong | Correct |
| --- | --- |
| `workspace.apps.memberships` | `workspace.appMemberships` |
| `workspace.apps.assign` | `workspace.appAssignments.assign` |
| `workspace.apps.unassign` | `workspace.appAssignments.unassign` |
| `workspace.apps.orgRoles` | `workspace.orgAppRoles` |
| `workspace.apps.permissions` | `workspace.permissions` |

Files: `src/app/(app)/orgs/[slug]/members/page.tsx` (128, 145, 146),
`src/app/api/organizations/[id]/app-memberships/route.ts` (36),
`src/app/api/organizations/[id]/app-memberships/[assignmentId]/route.ts` (28, 51),
`src/app/api/organizations/[id]/app-assignments/route.ts` (69),
`src/app/api/organizations/[id]/app-assignments/[assignmentId]/route.ts` (20).

`src/app/api/organizations/[id]/app-assignments/route.ts:25` also reports
"Expected 0-1 arguments, but got 2" — that is the same call reaching the wrong
resource. Fix the resource first; if an arity mismatch remains, **report it, do
not delete an argument**.

### 1c. Entitlements (5 errors)

`entitlements` is **not** on the root — it is `workspace.apps.entitlements`
(it maps to `core.appSubscriptions`).

| Wrong | Correct |
| --- | --- |
| `workspace.entitlements` | `workspace.apps.entitlements` |

Its `list(appId: string)` takes **a plain string**, and resolves to
`AdminResult<AdminSubscription[]>` — the payload is a **bare array**, not a list
envelope.

So two more things must change at those call sites:

- `list({ organizationIds: [...] })` and `list({ organizationId, status })` are
  wrong — the parameter is a single `appId` string. **Report these call sites
  rather than guessing**: the previous shape passed a filter object that this
  resource does not accept, and inventing a filter would silently change what
  the page shows.
- `result.data.data` must become `result.data` (it is already the array).
  Errors: `src/app/(app)/apps/[slug]/_data.ts:81`,
  `src/app/(app)/orgs/(list)/page.tsx:99` and `:100`.

Files: `src/app/(app)/apps/[slug]/_data.ts` (48, 57, 81),
`src/app/(app)/apps/[slug]/subscribers/[subscriptionId]/page.tsx` (60),
`src/app/(app)/orgs/(list)/page.tsx` (96, 99, 100),
`src/app/(app)/orgs/[slug]/_data.ts` (72).

`src/app/api/organizations/[id]/apps/route.ts:35` (`grant`) and
`src/app/api/organizations/[id]/apps/[appId]/route.ts:51` (`update`) hit the same
resource, which exposes only `list`. **Report both — do not invent a verb.**

### 1d. Organization feature grants (3 errors)

Org-level grants live under `workspace.features.orgs`
(`packages/platform/src/resources/features.ts:134`), not on `features` directly:

| Wrong | Correct | Signature |
| --- | --- | --- |
| `workspace.features.grant(` | `workspace.features.orgs.grant(` | `(organizationId, params)` |
| `workspace.features.revoke(` | `workspace.features.orgs.revoke(` | `(organizationId, featureId)` |

Files: `src/app/api/features/organizations/[organizationId]/route.ts` (24),
`src/app/api/features/organizations/[organizationId]/[featureId]/route.ts` (29, 49).

Line 29 reports "Expected 2 arguments, but got 3" — that is the same call; once
it targets `orgs.revoke(organizationId, featureId)` the arity is right.

### 1e. Widget note collections need a second Console root (4 errors)

`apps/console/src/lib/services/widgets.ts` currently builds **only** the operator
client (`@876/widgets/operator`), which exposes `notes` and `stats`.
`collections` exists only on the service client
(`packages/widgets/src/server/client.ts`).

Add a second export to that existing file — do **not** create a new file and do
**not** replace the operator export:

```ts
import { create876WidgetsServiceClient } from '@876/widgets/service'

/** Widgets service transport, which owns note collections. */
export function createWidgetsService(requestId?: string) {
  return create876WidgetsServiceClient({
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
  })
}

export const widgetsService = createWidgetsService()
```

Note the service client takes **no** `requestId` — accept the parameter for
signature symmetry with `createWidgets` but do not pass it through, and say so
in a comment. (Passing it is a type error; that exact mistake was made in
Couriers last pass.)

Then in `src/app/api/note-collections/route.ts` (13, 35) and
`src/app/api/note-collections/[id]/route.ts` (25, 51), change
`widgets.collections` to `widgetsService.collections` and import
`widgetsService` from `@/lib/services/widgets`.

### 1f. Billing catalog is on the operator root (2 errors)

`billing` (service/integration) exposes `bankAccounts customers invoices items
organizations paymentIntents paymentMethods paymentModes payments`.
`billingOperator` exposes `customers paymentIntents paymentMethods plans prices
products stats subscriptions`.

In `src/lib/billing/mirror.ts`: `billing.plans` (170) → `billingOperator.plans`,
`billing.prices` (191) → `billingOperator.prices`. `billingOperator` is already
imported in that file.

Two more in the same file — `:273` "Expected 3 arguments, but got 1" and `:392`
an object passed where a string is expected. **Report both; do not change the
arguments.** Getting a Billing mirror call wrong writes bad financial data.

### 1g. `src/lib/billing/mirror.test.ts:39` — duplicate object key

The orchestrator renamed `coreAdmin:` to `platform:` in this mock and the file now
has two `platform:` keys in one object literal. **Merge them into a single
`platform:` key** containing all the sub-resources from both, preserving every
mock function. Do not delete either set.

### 1h. `src/lib/platform-org.ts` (2 errors)

`workspace.crm` does not exist — CRM is its own root. Change
`workspace.crm.<x>` to `crm.<x>` and add
`import { crm } from '@/lib/services/crm'`. Lines 26 and 28.

### 1i. `src/app/api/organizations/[id]/customers/route.ts:22`

`createConsole876Client` no longer exists. Console's customers here are
**Billing's** registry. Use the request-scoped factory already exported by
`@/lib/services/billing`:

```ts
import { createBilling } from '@/lib/services/billing'
// ...
const billing = createBilling(requestId)
```

Keep whatever request-id resolution the surrounding handler already does, and
keep its `requireConsolePermission` call exactly where it is.

### 1j. CRM contract type aliases (21 errors)

`src/features/crm/types.ts` and `src/features/crm/request-customer-option.ts`
import `Crm*`-prefixed names from `@876/crm`. Those names never existed on the
package — they were aliases the deleted `@876/client` facade applied.

**This exact problem was already solved for the CRM app**, and you must copy that
solution rather than renaming call sites:

- The authoritative alias map is `packages/client/src/index.ts` lines **53–139**
  (e.g. `Customer as CrmCustomer`, `RequestList as CrmRequestList`,
  `UpdateRequestTaskInput as CrmRequestTaskUpdateInput`).
- The finished reference is `apps/crm/src/types/crm.ts`, which re-exports from
  `@876/crm` with those renames.

Make `apps/console/src/features/crm/types.ts` own the same aliasing:
`export type { Customer as CrmCustomer, ... } from '@876/crm'`, covering every
name the file currently lists. Then in `request-customer-option.ts`, import
`CrmCustomer` from `@/features/crm/types` instead of from `@876/crm`.

Do not rename `Crm*` usages elsewhere in Console — the alias file is the fix.

### 1k. Implicit `any` (26 errors, TS7006/TS7031)

These are **consequences**, not separate bugs: a callback lost its inferred
parameter type because the expression it iterates was one of the wrong-resource
calls above. Fix 1a–1j first, then re-read each remaining site and fix it by
correcting the **source expression's** type.

Do **not** add an explicit `any`, do **not** add `@ts-expect-error`, and do
**not** annotate the parameter to silence it. If a site still will not type
after its source is correct, leave it and report it.

---

## Part 2 — The last 22 rule references

Six files still describe the deleted facade. `.claude/rules/` is canonical and
every rule file also exists at `.agents/rules/<same-name>`; **both trees must end
byte-identical.** `CLAUDE.md` is repo-root only. Do not touch
`.claude/rules/cli.md`. `.grok/rules/` no longer exists — do not create it.

| File | Refs |
| --- | --- |
| `.claude/rules/workspace-control-plane.md` | 7 |
| `CLAUDE.md` | 6 |
| `.claude/rules/sdk-conventions.md` | 5 |
| `.claude/rules/data-fetching.md` | 2 |
| `.claude/rules/shared-product-ui.md` | 3 |
| `.claude/rules/api-access.md` | 1 |
| `.claude/rules/access-tiers.md` | 1 |

The model to describe, verified against the code:

- **`$876` now means the 876 Account only** — auth, current user, sessions, OAuth grants, mobile numbers (`packages/account/src/account.ts`). A surviving `$876` mention is correct **only** with that meaning; leave those and list them in your report.
- `workspace` = one organization's own plane; `platform` = the 876 operator plane. Both project the same Core API.
- Product roots are explicit: `crm.`, `work.`, `billing.`, `couriers.`, `storage.`, `widgets.`.
- The entrypoint names the **caller principal** — `session`, `service`, `operator`, `integration`. Authority lives in the import, not in a `.admin` segment on the call chain.
- Each host composes only what it needs under `src/lib/services/`. **No replacement aggregator** exists or may be described.
- `@876/sdk` → `@876/account`; `@876/admin` → `@876/platform`; `@876/client` is deleted.

Two things you must state honestly rather than smooth over, because the code does
not yet enforce them: `@876/billing/service` and `@876/couriers/service` are
currently aliases of their **integration** client, and `@876/storage/service` and
`@876/storage/operator` are the **same** client under two names. Describe these
entrypoint names as caller intent and note the backend does not yet enforce two
key classes there.

Change only what the migration made false. Do not reflow paragraphs, reorder
sections, or delete a `## Do not` entry that still holds.

---

## What you must NOT do

- **Do not delete `packages/client`, `packages/sdk`, or `packages/admin`.** The orchestrator does that last, after verifying nothing imports them.
- Do not touch anything under `packages/**` except the one addition in §1e.
- Do not touch `apps/crm`, `apps/enterprise`, `apps/876`, `apps/billing`, `apps/invoice`, or `apps/couriers` — all six are finished and compile.
- Do not add `eslint-disable`; do not use `as any` (`as unknown as T` only, with a comment).
- Do not delete or skip a test, and do not weaken a production signature to make one easier.
- Do not remove a `requireConsolePermission` call or an audit write, and do not move one relative to the facade call it guards.
- Do not hand-edit `pnpm-lock.yaml`.

## Report

Write `.claude/reports/muse/2026-08-31-finish-console-and-rules.md`:

- a table of the 76 errors with, for each, the fix you applied — or **"reported, not fixed"** with the reason;
- **every site this brief told you to report rather than fix** (§1c entitlement filters and the two missing verbs, §1f mirror arity/argument, and any §1k site that would not type), quoted with its surrounding code so the orchestrator can decide;
- every remaining `$876` mention in the rules and why it is correct;
- confirmation that `.claude/rules/<file>` and `.agents/rules/<file>` are identical for all six files;
- an explicit statement that **no verification command was executed**, because you cannot execute one in this container.
