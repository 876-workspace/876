# Shell Layout, Navigation & Permissions Overhaul — Final Repository Review

- **Run:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Branch:** `feat/shell-layout-navigation-overhaul`
- **Repository:** `876-workspace/876`
- **Review date:** 2026-09-05
- **Status:** `REPOSITORY_REVIEW_COMPLETE_RUNTIME_ACCEPTANCE_OPEN`
- **Implementation head reviewed:** `f06101806f45122fca48ed66b63511a199dadaf9`
- **Base at final code review:** `main` at `1419aaee85264ed4c278d952af6e4687383df157`
- **Divergence at final code review:** 64 commits ahead / 0 behind

This report closes the repository-side implementation and static review for the
shell/layout/navigation run. It does **not** claim production acceptance or a
green executable verification matrix. Those gates require runtime access that
was not available in this session and remain explicitly listed below.

## Pull-request status

No pull request is approved by the user for this work.

Historical draft PR **#478** was created earlier as a CI harness, then closed
without merge by the `876-workspace` account on 2026-09-05 at 13:18:08Z. The
user subsequently made explicit that no PR had been approved.

Therefore:

- PR #478 remains closed and unmerged;
- it was not reopened during this final review;
- no replacement PR was created;
- no PR may be opened or reopened for this run without explicit user approval.

The branch itself remains the review artifact.

---

## 1. Original product defects and delivered fixes

### Shared Tailwind source coverage

The host apps were not scanning shared product-UI package source trees, so
Tailwind utilities used only inside packages such as `@876/projects-ui` could be
missing in production. This explained layouts such as the Projects summary row
rendering as stacked full-width bars.

Delivered:

- shared product-UI `@source` coverage in host apps;
- `scripts/shared-ui-packages.mjs` as the shared registry;
- `scripts/check-tailwind-sources.mjs` plus regression coverage;
- `pnpm check:transpile` integration so future shared package drift is detectable.

### Shared shell spacing

Delivered a shared `--876-shell-gutter` contract in `@876/ui` using Tailwind
v4's real spacing token:

```css
--876-shell-gutter: calc(var(--spacing) * 4);
--876-shell-gutter: calc(var(--spacing) * 6);
--876-shell-gutter: calc(var(--spacing) * 8);
```

Ordinary routed/list/detail surfaces and the shared shell/sidebar geometry now
consume that rhythm instead of compounding unrelated insets. The deliberately
wider `Page hub` variant remains unchanged because the binding app-layout rule
explicitly sanctions it for pure navigation hubs such as `/workspace` and
Settings landing pages.

### Navigation icons

Delivered semantic, distinct icons for the shell surfaces touched by this run,
including Console, Projects, Couriers, CRM, Billing, Invoice, and Console product
workspace rails.

Projects now has distinct Projects / Issues / Board / Labels concepts and a
persisted collapsible sidebar.

The final review found three icon gaps that earlier collision tests had missed:

1. Console's **Projects workspace** reused the `requests` icon for Projects and
   Issues. Fixed in `2a886ecb`; workspace colors were extended in `dc501baa` and
   `410c4765` now checks every `APP_WORKSPACES` section rail for collisions.
2. Billing reused icon components for Customers/Payroll and Banking/Reports.
   `ea2c88ad` introduced a semantic Billing icon registry, `0a9f4982` wired the
   sidebar to it, and `8685f6d4` adds a top-level rail collision test.
3. Invoice reused the payment icon for Reports. `3c3a28ec` introduced a semantic
   Invoice icon registry, `3be05b5d` wired it into the sidebar, and `f0610180`
   adds collision coverage.

Couriers and CRM were inspected in the same final pass and their visible rail
icons were already distinct.

### Projects and Console record pages

Delivered:

- standalone full-page project and issue records in 876 Projects;
- standalone full-page project and issue records in Console platform context;
- the same treatment inside organization workspaces;
- shared `@876/projects-ui` record presentation rather than host-specific forks;
- dedicated record loading/Suspense boundaries;
- removal of duplicate/backward compatibility `ProjectDetail.projectsHref`
  residue;
- explicit display-only empty states for assignee, due date, and estimate rather
  than expanding this run into assignment-picker work.

### Console `/workspace`

Delivered a guarded `/workspace` hub, canonical organization/entitlement
resolution, workspace cards, and workspace routes. The duplicate organization
heading was removed from the workspace header.

### Permission presentation

Delivered product → module → permission grouping across the read-only member
access view and role editing surfaces, with shared rollup behavior rather than
flattened `Product · Module` top-level groups.

### Markdown/comment editor

Delivered the remaining Phase 4 editor work:

- token-based light/dark surfaces;
- distinct toolbar/body surfaces;
- visible focus-within treatment;
- explicit Write/Preview state;
- responsive toolbar wrapping;
- semantic icons where the design-system registry owns one;
- existing bold/italic/link keyboard shortcuts;
- controlled value/id/name/placeholder behavior;
- same shared Markdown editor for comment create and edit;
- inline create/update errors that preserve the user's draft.

The existing Editor.js package was inspected but deliberately not substituted
because Projects comments persist Markdown text; changing editors would have
changed the data contract without a product requirement.

---

## 2. Projects `Forbidden.` diagnosis and durable access fix

Production diagnosis established that `comments.create` already existed in the
Projects permission catalog and was already granted by the `admin` and
`super-admin` app roles. The affected Efesto Projects assignment instead carried
the default `staff` role and therefore only had read permissions.

The durable platform fix maps the target member's organization role to the app
role when automatic assignments are created:

- organization `super_admin` / `super-admin` → app `super-admin`;
- organization `admin` → app `admin`;
- ordinary/missing roles → the live default role;
- no fallback ever substitutes a broader role.

Manual requested-role flows still retain the explicit super-admin elevation
check.

### Legacy app-role compatibility found in final review

The previous provisioning lookup accepted the historical persisted app-role key
`super_admin`, but the first shared resolver implementation matched only the
canonical `super-admin` app-role key. That could have sent an organization with
a legacy role row back to the default read-only role.

Final fix:

- `77387aaa` restored legacy persisted `super_admin` app-role compatibility;
- `bed0b990` narrowed matching to the **exact** historical alias so arbitrary
  custom keys such as `ADMIN` are not treated as governed system roles;
- `461ad476` and `3a32fedf` add regression coverage for both behaviors.

### Provisioning replay lifecycle hardening

Final review also found that a provisioning replay could set a revoked assignment
back to `status: active` without clearing `revokedAt`/`deletedAt`. Effective
permission resolution still considered that row revoked.

- `11b70128` clears revocation/deletion lifecycle metadata on reactivation;
- it deliberately leaves `appRoleId` unchanged so replay cannot overwrite a
  later administrator role choice;
- `55a72c9e` covers those invariants.

---

## 3. Production backfill safety

`apps/api/scripts/backfill-app-assignment-roles.ts` remains **dry-run by default**.
It only discovers active, non-revoked/non-deleted assignments currently attached
to a live default role.

Candidate output includes:

- assignment ID;
- organization ID;
- user ID;
- app ID;
- current role ID;
- proposed role ID;
- organization role used for resolution.

Apply was hardened repeatedly during closeout:

- `5b6dfe7e` changed writes to compare-and-set semantics;
- `99122d33` added active-membership/target-role revalidation and richer candidate
  context;
- `6ca403e3` asserted that the default dry-run performs zero writes;
- `ee9edbae` strengthened apply so it re-fetches the current live app-role set and
  reruns `resolveAppAssignmentRole` immediately before the write;
- `a5b31858` covers fresh re-resolution, stale organization roles, stale target
  resolution, compare-and-set application, and dry-run safety.

A concurrent operator change therefore wins instead of being silently
overwritten by the backfill. `skippedAfterDiscovery` reports candidates that
became stale between discovery and apply.

No production backfill was executed during this repository review.

---

## 4. Static quality/security review

### Current branch state

At the final code-review head (`f0610180`), GitHub comparison reported:

- ahead of `main`: **64 commits**;
- behind `main`: **0 commits**;
- merge base: `1419aaee85264ed4c278d952af6e4687383df157`.

The final report/tracker documentation commits necessarily advance the branch
after that implementation snapshot; exact divergence must be re-read before any
future merge operation.

### Attribution

The branch commit collection (100-commit window, containing the complete 64
commit branch delta at review time) was searched directly. No branch commit
message contained:

- `Co-Authored-By`;
- `Generated with`;
- `Claude`.

Older repository history outside this branch contains historical attribution
trailers, but they are not part of this integration branch's 64-commit delta.

### Diff hygiene

The current `main...branch` changed-file inventory contains no newly changed
`.env` file and no delegated `*-run.log` transcript.

The earlier full committed patch audit found no changed production/test-code
`as any`, `eslint-disable`, `@ts-ignore`, `as unknown as`, private-key material,
or secret assignment pattern. Subsequent final-review code was inspected file by
file and consists of role resolution/backfill guards, semantic icon registries,
tests, and documentation.

Intentional `console.log` use is confined to operational/check scripts that emit
machine-readable or pass/fail output.

### Current GitHub status signal

The final implementation head has **no commit-status checks attached/reported**.
It also has no pull-request-triggered workflow runs because the historical PR is
closed.

While #478 was open, multiple independent workflow runs were retried and all
failed before step 1 with empty step lists/no job logs. That historical result
was classified as an Actions runner/account execution problem, not as evidence
that repository tests failed. It is also not a green signal.

---

## 5. Executable verification still required

The repository-side static review cannot truthfully replace execution. Before
merge/release acceptance, run the following from a real checkout with pnpm and
dependencies available.

### Formatting

```bash
pnpm format:check
```

This is important because `apps/api` lint targets `src`, while the production
backfill lives under `apps/api/scripts`; root Prettier coverage is the formatting
gate for that script.

### Touched applications

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test

pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test

pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-app lint
pnpm --filter @876/crm-app test

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test

pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test

pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
pnpm --filter @876/couriers-app test
```

### Shared packages and API

```bash
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test

pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api test
pnpm --filter @876/api boundaries

pnpm --filter @876/core typecheck
pnpm --filter @876/core test

pnpm --filter @876/editor typecheck
pnpm --filter @876/editor test

node scripts/check-app-structure.mjs
pnpm check:transpile
```

Known API boundary baseline: the base previously had **18** `no-circular`
violations. Acceptance must confirm there is no nineteenth violation.

### Production builds

```bash
pnpm --filter @876/console build
pnpm --filter @876/projects-app build
pnpm --filter @876/crm-app build
pnpm --filter @876/billing-app build
pnpm --filter @876/invoice-app build
pnpm --filter @876/couriers-app build
```

No command in this section is recorded as passed by this report; they are the
remaining executable acceptance gate.

---

## 6. Production and browser acceptance still required

### Efesto assignment repair

The diagnosed production assignment is still outstanding:

- organization: `org_fa2cfb0bce834ae6a6537830159e5f14`;
- assignment: `asg_90275575846147508476c7e2b16c4335`;
- diagnosed app role: default `staff`;
- expected role for the organization super-admin: `super-admin`.

Safe sequence:

```bash
pnpm --filter @876/api app-access:backfill-roles
# verify dryRun: true; changed: 0; inspect every candidate

pnpm --filter @876/api app-access:backfill-roles --apply
# only after candidate review
```

After apply/repair:

1. re-read the Efesto app membership;
2. confirm `super-admin` and `comments.create` are effective;
3. confirm no explicit deny removes the write permission;
4. create a non-sensitive real comment;
5. edit it;
6. delete it;
7. verify a normal staff/default-role subject remains denied for writes it does
   not hold.

No production mutation is claimed here.

### Browser matrix

Still required in light and dark at 1280, 1440, and 1920px for the touched
Console/Projects shell, record, workspace, permission, and Markdown editor
surfaces. In particular verify:

- shell/list/content spacing reads coherently;
- project/issue records own the page;
- Projects summary facts form the intended row;
- no visible rail has duplicate semantic icons;
- Projects sidebar collapse preference persists;
- workspace organization heading is not duplicated;
- permission hierarchy reads product → module → permission;
- Markdown create/edit surfaces are readable and focusable in both themes;
- inline comment errors preserve drafts.

No browser acceptance is claimed by this report.

---

## 7. External tracker item

`PROJ-10` was not found in this repository's GitHub Issues. Its original premise
("wire comment permissions to the catalog") is incorrect because comment
permissions already exist in the catalog and the system roles. The real defect
was organization-role → app-role assignment/backfill.

Resolve `PROJ-10` in its actual external tracker by either closing it as based on
a false premise or rewriting it around the assignment/backfill defect. Do not
create a duplicate GitHub issue merely to satisfy this run.

---

## 8. Final repository-side conclusion

Repository-side implementation and static review are complete to the capability
available in this session. The final review did not merely document the branch;
it found and corrected additional functional/safety gaps in role compatibility,
backfill race handling, and navigation icon contracts.

The remaining work is **acceptance/runtime work**, not unimplemented repository
features:

- execute format/typecheck/lint/test/build/boundary checks;
- repair and verify the production Efesto assignment;
- run the production comment permission smoke test;
- complete the browser light/dark viewport matrix;
- resolve PROJ-10 in its owning tracker.

The run must remain `RUNTIME_ACCEPTANCE_OPEN` until those items are completed.

**PR policy for this run:** do not create, reopen, mark ready, or merge a pull
request unless the user explicitly approves that PR action in a later request.
