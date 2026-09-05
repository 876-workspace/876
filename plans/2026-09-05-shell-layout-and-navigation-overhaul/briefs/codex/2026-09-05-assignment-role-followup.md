# Follow-up: the role mapping has no test where it actually matters

Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create/switch branches. Do not commit. Do not open a PR.**

Your `resolveAppAssignmentRole` resolver is correct: it filters deleted roles,
honours a requested role only when that id is in the live list, maps the
subject's organization role, then falls back to the app default and finally to
no role. It never substitutes a broader role. That part is kept.

Two things must change before it can be accepted.

## Defect 1 — 20 tests, none of them on the code you changed

`packages/core/src/access/app-assignment-role.test.ts` has 20 cases, all against
the pure resolver. **Zero tests were added or changed in `apps/api`**, yet you
modified:

- `apps/api/src/modules/app-access/app-access.service.ts`
- `apps/api/src/modules/organizations/access.service.ts`
- `apps/api/src/modules/organizations/access.repository.ts`
- `apps/api/src/services/provisioning.ts`
- `apps/api/src/services/provisioning.repository.ts`
- `apps/api/src/services/auth.ts`

The resolver being correct in isolation proves nothing about whether
provisioning actually calls it, passes the subject's real organization role, and
persists the resulting role id. That integration is the entire bug. A pure-unit
suite that cannot fail when the wiring is wrong is not coverage
(`.claude/rules/testing.md` — "every test must be able to fail").

Add tests at the call sites. At minimum:

- provisioning a **new** organization gives its creating `super_admin` the app's
  `super-admin` role, asserted on the persisted assignment, not on a return
  value alone;
- an org `admin` provisioned into an app receives `admin`;
- an ordinary member receives the default role and **does not** hold
  `comments.create` in `effective_permissions`;
- accepting an invite goes through the same resolver rather than a second
  code path;
- the operator-facing create path still honours an explicitly requested role;
- an app with no `super-admin` role falls back to the default, not to `admin`;
- a revoked or inactive assignment still resolves to `[]` effective permissions.

Assert exact call arguments and full result shapes, not `toBeDefined()`.

## Defect 2 — the elevation guard is untested

Nothing in `apps/api/src` references `requireSuperAdminForElevation` or
`app-membership/super-admin-required` from a test file. The brief required this
and it is the one case where an authorization change could go wrong silently.

Two cases, both explicit:

- a **non**-super-admin caller who explicitly requests the super-admin app role
  is still rejected with `app-membership/super-admin-required`;
- an org `super_admin` provisioned **automatically** does receive the
  super-admin app role, because it is derived from the subject's own
  organization role rather than from a caller's request.

Those two together are what prove the mapping did not become a way around the
guard.

## Defect 3 — blanket underscore replacement

`mappedRoleKey` normalizes with `organizationRole.replaceAll('_', '-')`.
`.claude/rules/naming.md` is explicit: *"Never mass-replace `_` with `-`.
Durable values use an explicit, reviewed old→new migration map so provider data,
customer data, hashes, and opaque IDs cannot be changed accidentally."*

It is safe in practice here — only two keys match — but organization role names
and app role keys are both durable contracts, and an explicit map is the form
the rule requires:

```ts
/** Organization role → the app role key it maps to. Durable on both sides. */
const ORG_ROLE_TO_APP_ROLE: Record<string, string> = {
  super_admin: 'super-admin',
  admin: 'admin',
}
```

Keep the `toLowerCase()` if you have a reason; say why in the report if so.

## Context you do not need to fix

`pnpm --filter @876/api boundaries` reports **18 `no-circular` violations**.
I verified these are **pre-existing on this branch's base** — 18 before your
change and 18 after, so you did not introduce them. **Do not attempt to fix
them**; that is unrelated work and would balloon this change. Just do not add a
nineteenth.

## Constraints

- Keep the resolver's fallback order and its fail-closed behaviour.
- Do not run the backfill script against any database. Leave it dry-run by
  default.
- Do not rename any permission key, role key, table, or column.
- No `eslint-disable`, `@ts-ignore`, `as any`.
- Do not touch `packages/ui`, `apps/*/src/components/shell/**`, or
  `apps/*/src/app/globals.css` — other work owns those concurrently.
- Do not commit.

## Verify (foreground, read the output)

```bash
pnpm --filter @876/api typecheck && pnpm --filter @876/api lint && pnpm --filter @876/api test
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/api boundaries   # expect the same 18 pre-existing errors, not 19
```

## Report

Append to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-05-app-assignment-role-mapping.md`
under `## Follow-up`: the **counted** number of `it()` cases added **in
`apps/api`** specifically; which call sites are now covered; the two elevation
cases and their assertions; the boundaries count before and after; verification
output; and anything you could not verify.
