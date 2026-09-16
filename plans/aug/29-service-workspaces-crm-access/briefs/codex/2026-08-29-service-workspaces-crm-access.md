# Service workspaces, Console `/requests`, and CRM access control

Branch: `feature/service-workspaces-console-requests` (already merged up to
`origin/main` @ c214b69a — do **not** merge or rebase again).
Model/effort for this run: `gpt-5.6-sol`, medium.

You are continuing work an earlier agent started. The architecture direction is
already accepted; your job is to correct it where it drifted, finish the parts
it deferred, and make the whole thing verifiable.

Read first, in this order:

1. `docs/architecture/018-product-entitlements-and-service-workspaces.md`
2. `docs/service-workspace-integration-guide.md`
3. `.claude/rules/access-control.md`  (merged in PR #432 — the platform standard)
4. `.claude/rules/access-tiers.md`, `.claude/rules/platform-services.md`,
   `.claude/rules/workspace-control-plane.md`, `.claude/rules/module-settings.md`
5. `packages/core/src/access/catalogs.ts` and `packages/core/src/access/navigation.ts`
6. `packages/crm/src/workspace.ts`, `packages/crm/src/index.ts`
7. `apps/console/src/lib/permissions.ts`, `apps/console/src/lib/auth/route-permissions.ts`,
   `apps/console/src/components/shell/nav-config.ts`

## Hard rules for this run

- **Never commit AI attribution.** No `Co-Authored-By: Claude/Codex`, no
  "Generated with" lines. `.claude/rules/git.md` forbids it.
- **Do not create branches, PRs, merges, or rebases.** Commit to the current
  branch only. Do not touch `main`.
- **No `eslint-disable` and no `as any`.** Use `as unknown as T` where a test
  genuinely needs a type violation. A gate satisfied by suppressing it is a
  failed phase.
- **Do not weaken production code to make a test easier** (no making a required
  prop optional, no deleting a toolbar so a render test passes).
- **A permission you declare must be granted by a named role.** Anything added to
  a catalog or to a navigation `requires` must be held by at least one system
  role, and the existing anti-drift test must still pass.
- **Migrations: generate and validate them, never apply them to a remote
  database.** The user has authorised migration work for this run. Write the
  migration under
  `apps/<service>/prisma/migrations/<timestamp>_<name>/migration.sql`, then
  prove it with `prisma validate`, `prisma format`, and
  `prisma migrate diff --from-migrations … --to-schema-datamodel …` so the
  migration and the schema provably agree. Regenerate the Prisma client
  (`prisma generate`) so typecheck sees the new fields — the most common failure
  in delegated runs here is a stale generated client. Do **not** run
  `migrate deploy`/`migrate dev` against a live or production URL; deployment is
  the orchestrator's step.
- Atomic commits, Conventional Commits, one logical change each
  (`.claude/rules/git.md`). Commit after each phase.
- Run the verification commands at the end of every phase and fix what breaks
  before starting the next phase. Do not report a green check you did not run.

## Verification commands (run these, in the foreground)

```bash
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/crm typecheck && pnpm --filter @876/crm test
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
pnpm --filter @876/api typecheck && pnpm --filter @876/api test && pnpm --filter @876/api boundaries
node scripts/check-app-structure.mjs
```

Console's suite is slow; give it time rather than backgrounding it.

---

## Phase 1 — Correct the `console:requests` decision in the docs

The previous agent deliberately kept the permission id `console:support` while
renaming the route to `/requests`, and wrote that decision into its report and
possibly into the ADR. **The user overruled that.** The rename is already done in
this branch's merge commit:

- `packages/core/src/access/catalogs.ts` — the console module action is
  `requests`, producing the key `console:requests`.
- `apps/console/src/lib/permissions.ts`, `.../auth/route-permissions.ts`,
  `.../components/shell/nav-config.ts` and their tests all use
  `console:requests` and the `/requests` path.

Your job in this phase:

1. Grep the whole repo for `console:support` and `'/support'` and finish
   anything the merge missed — **except** `/orgs/[slug]/support`, which is a
   different surface (a customer organization's requests raised with 876) and
   must keep its path.
2. Because `console:support` may already be persisted in Console's role rows,
   add a **one-way compatibility read**: where Console resolves stored
   permission keys into effective permissions, map a stored `console:support` to
   `console:requests`. Put it in one named, documented place (a
   `LEGACY_PERMISSION_ALIASES` map beside the catalog adapter), with a comment
   saying it exists only so pre-rename role rows keep working and that new code
   must never write the legacy key. Cover it with tests: a role holding only the
   legacy key resolves `console:requests`; the legacy key is never emitted by
   the catalog; the alias map does not widen access to anything else.
3. Update `docs/architecture/018-product-entitlements-and-service-workspaces.md`
   to state the decision as taken: the surface, route, and permission are all
   `requests`, and the legacy key survives only as a read alias. Remove any text
   claiming the permission stays `console:support`.
4. Update `.claude/reports/gpt-web/…` only if a report in this branch asserts the
   opposite; do not rewrite history elsewhere.

## Phase 2 — Billing entitlement is opt-in, finance workspace is not

The user's decision: **a new organization must not automatically receive an
`876-billing` product entitlement**, but it must still get its finance/customer
workspace, so invoices raised by Couriers/Invoice/CRM land in records that are
already there if the org later activates Billing.

1. Verify the current behaviour in `apps/api/src/services/provisioning.ts`.
   `DEFAULT_ORG_APP_SLUGS` currently reads `[ENTERPRISE_APP_SLUG]`, which looks
   correct — **confirm it, do not assume it**. Trace every other path that could
   create a `876-billing` subscription: `provisionOrganization`, the seeds in
   `apps/api/src/seeds/provisioning.ts`, `finance-provisioning.ts`, the
   `billing_customer_outbox` path, and org registration
   (`register_business` / the enterprise sign-up route).
2. If any path still grants `876-billing` implicitly, remove that grant and keep
   the finance workspace provisioning intact.
3. Add regression tests that state the invariant plainly:
   - provisioning a new organization creates the `876-enterprise` subscription
     and **no** `876-billing` subscription;
   - provisioning still ensures the organization's finance workspace / customer
     registry row;
   - a later explicit `876-billing` grant is idempotent and opens the **same**
     workspace — no second tenant, no copied records.
4. Record the invariant in `docs/org-provisioning.md` and in ADR-018 under
   "Historical continuity".

## Phase 3 — CRM permission catalog, roles, and the Console↔CRM boundary

The user asked directly: should Console's roles extend into CRM, or should CRM
have its own? **Answer, and implement: separate catalogs, one shared mechanism.**
Write this answer into the ADR in these terms:

- Console's permission plane governs **the Console surface** — who among 876
  staff may open `/requests` at all. It is operator-tier and stays
  `console:*`.
- CRM's permission plane governs **capabilities inside a CRM workspace** —
  who may read, create, update, delete requests, tasks, reminders, notes,
  teams, categories, and forms. It is the same plane whether the caller
  arrives through the standalone 876 CRM product, through Console's operator
  surface over 876's own workspace, or through an embedded surface in a host
  product at the integration tier.
- They are **not duplicated and not merged**: a Console operator needs
  `console:requests` to reach the surface **and** the CRM permission for the
  operation. Console permissions never imply CRM permissions and vice versa.
  Two gates, two catalogs, one resolver (`resolveEffectivePermissions`).

Implementation:

1. Extend `crmPermissionCatalog` in `packages/core/src/access/catalogs.ts` so it
   covers every CRM module that actually exists in `apps/crm-api/prisma/schema/`:
   requests, customers, tasks, **reminders**, **notes**, teams, categories,
   **priorities**, **request_forms**, reports, settings. Match the real models —
   read the schema, do not guess. Keep the dot-delimited product-app key form
   (`requests.create`), which is what `defineAppPermissionCatalog` already
   produces for `876-*` apps.
2. Define CRM **system role templates** the way the app-access plane expects
   (see `apps/api/src/services/app-role-provisioning-catalog.ts` and
   `apps/api/src/modules/app-access/`). At minimum: `owner`, `admin`, `agent`
   (works requests and tasks, cannot change settings/teams), and `viewer`
   (read-only). Add the catalog-drift test required by
   `.claude/rules/access-control.md`: every system role's permissions are a
   subset of the CRM catalog, and every permission a CRM surface requires is
   granted by at least one role.
3. Wire the Console side. Console administers CRM access for a customer
   organization **through the app-access plane, at the operator tier** — not by
   inventing a Console-local CRM role table. Concretely:
   - Console's existing app-access/role administration UI must be able to list
     CRM's catalog and roles and assign them, exactly as it does for other
     product apps. If that generic surface already exists, register CRM into it
     rather than building a CRM-specific page.
   - Console's own `/requests` operator surface checks `console:requests` at the
     route guard (already true) **and** the corresponding CRM permission before
     the mutating operation, in the route handler, per the three-layer rule.
   - Every mutating Console route handler under the requests surface must have
     the authorization check; extend Console's existing guard-coverage test so a
     new handler cannot ship without one.
4. Do **not** create a CRM product entitlement for Console. Console reaches 876's
   own CRM workspace at the operator tier with the internal key, as ADR-018 says.

## Phase 4 — Name the request-intake vocabulary, and model it as modules

The user asked what the specific Console-embedded "raise a support request with
876" form should be called, and how tasks/reminders/requests break into modules.
Settle it, write it into the ADR and into
`docs/service-workspace-integration-guide.md`, and make the code agree.

Use this vocabulary — it reuses what already exists rather than inventing a
parallel one (`packages/crm/src/request-form-types.ts` already has `RequestForm`
with `placement: HOSTED | EMBEDDED`):

| Term | Meaning |
| --- | --- |
| **Request** | The canonical CRM record. One model, many origins. |
| **Request form** | A configured intake definition owned by a CRM workspace: fields, mapping, placement, target category/priority. Already modelled. |
| **Placement** | Where a form renders: `HOSTED` (its own page) or `EMBEDDED` (inside a host surface). Already modelled. |
| **Channel** | *How the request arrived*: `FORM`, `WIDGET`, `CHAT`, `EMAIL`, `API`, `AGENT`. This is the axis that is missing — add it as `Request.channel`, not as a second form type. |
| **Support intake** | The seeded, EMBEDDED request form in **876's own CRM workspace** that any 876 surface uses to raise a request with 876. This is the thing currently hardcoded in Console. Name it "876 Support" and seed it as data. |
| **Module** | A CRM functional area an org can enable: `requests`, `tasks`, `reminders`, `notes`, `teams`, `categories`, `request_forms`, `reports`. Module keys **must** match the CRM permission-catalog module keys — add the anti-drift test `module-settings.md` requires. |

So: there is exactly one request model and one request-form model. A live chat
interface, a knowledge-base article footer, and Console's support widget are all
the *same* request form rendered at different placements, differing only in
`channel`. Do not add an `addon` column, a `support_request` table, or a second
intake type.

Implementation:

1. Add `channel` to the CRM request model with a hand-written migration and a
   default that preserves existing rows (`FORM` or `AGENT` — pick by reading how
   existing rows are created, and say which you chose and why in the report).
   Surface it through `packages/crm` types, serializers, and the Console request
   record UI (a small labelled field, not a new section).
2. Replace Console's hardcoded support-intake defaults with a lookup of the
   seeded "876 Support" request form. The earlier agent already removed some
   stale defaults in `request-aside.tsx` / `request-identity.tsx`; finish that so
   nothing in Console hardcodes a category/priority that the workspace owns.
3. Declare the CRM module catalog with `defineModuleCatalog` per
   `.claude/rules/module-settings.md`, reusing the permission module keys, plus
   the drift test.
4. Write the vocabulary table into ADR-018 and the integration guide.

## Phase 5 — Make the extension path concrete without building it

ADR-018 correctly refuses to wire embedded CRM into Couriers/Billing/Invoice
yet. Keep that boundary. But make the next integration a *registration* rather
than a design exercise:

1. In `docs/service-workspace-integration-guide.md`, give the five fixed joints
   as a numbered checklist a future app follows (capability → operator route →
   integration route + scope → tier client → host surface), with the CRM
   `requests` capability worked through end to end as the example.
2. Define the CRM **integration scope** vocabulary explicitly
   (`crm.requests.read`, `crm.requests.write`, `crm.tasks.read`, …) and state
   that a host product gets scopes, never Console's internal key.
3. Do not add integration routes with no caller. Document them as the next step.

## Phase 6 — Report and hand back

Write `.claude/reports/codex/2026-08-29-service-workspaces-crm-access.md` and
commit it with the work. It must contain:

- a per-phase status table with the **counted** number of `it()` cases you added
  in that phase;
- every file changed and why;
- any migration SQL in full;
- decisions the brief did not settle, and how you settled them;
- **things you could not verify**, stated plainly — a truthful "not run" is worth
  more than a confident claim;
- gaps deliberately left, and the risk of each.

## Test floors (per phase, minimum new `it()` cases)

Phase 1: 8 · Phase 2: 10 · Phase 3: 20 · Phase 4: 14 · Phase 5: 0 (docs).

Meet the floors with tests that can actually fail — assert exact permission sets,
exact visible href lists, exact error codes, and both sides of every
`{ data, error }` result, per `.claude/rules/testing.md`. A test whose only
assertion is `toBeDefined()` does not count toward the floor.


## When every phase is done

Leave the branch committed and pushed-ready but **do not open the pull request**
— the orchestrator opens it after reviewing your work. State in the report
exactly which verification commands you ran, with their outcomes, so the PR
description can be written from facts rather than from your summary.
