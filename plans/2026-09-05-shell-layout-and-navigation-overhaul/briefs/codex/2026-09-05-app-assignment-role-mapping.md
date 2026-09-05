# Task: an org super admin must not be provisioned into an app as read-only

Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create/switch branches. Do not commit. Do not open a PR.**

## Read first

`.claude/rules/access-control.md`, `.claude/rules/app-access.md`,
`.claude/rules/express-api.md`, `.claude/rules/testing.md`.

## The bug, verified against production on 2026-09-05

Adding a comment in 876 Projects fails with `Forbidden.`

Traced: `POST /api/comments`
(`apps/projects/src/app/api/comments/route.ts:21`) calls
`requireApiPermission('comments.create')`, which returns 403 from
`apps/projects/src/lib/auth/api-permission.ts:40` when `canAccess` is false.

Probing `https://876-api.vercel.app` with the internal key established:

- `comments.create` **is** in the `876-projects` permission catalog
  (`packages/core/src/access/catalogs.ts:210`).
- The seeded template roles `super-admin` and `admin` **both grant it**
  (`apps/api/src/seeds/app-access.ts:125`).
- The Efesto organization's **copies** of those roles both grant it.
- The user's app assignment `asg_90275575846147508476c7e2b16c4335` carries
  `app_role.key = "staff"` with `is_default: true` — the read-only role — and
  therefore `effective_permissions` is the eight `*.view` keys only.

**So the catalog and the seeds are correct. The defect is that provisioning
assigns the app's `is_default` role regardless of the member's organization
role.** An organization `super_admin` is provisioned into a product app with
view-only access and cannot write anything until an operator hand-edits the
assignment. This happens to every member of every newly provisioned app.

Note for scoping: issue **PROJ-10 ("Wire comment permissions to the app
permission catalog") is based on a false premise** — the catalog wiring already
exists. Do not implement PROJ-10 as written.

## What to build

1. **Map the organization membership role to the app role at assignment time.**
   `super_admin` → the app's `super-admin` role, `admin` → `admin`, everything
   else → the app's default role. Find every place an app assignment is created
   — provisioning, invite acceptance, and the operator-facing create path — and
   make them all go through **one** resolver. Do not implement the mapping twice
   (`.claude/rules/ai-code-quality.md`).

2. **Do not weaken the elevation guard.**
   `requireSuperAdminForElevation`
   (`apps/api/src/modules/app-access/app-access.service.ts:266`) stops a
   non-super-admin from handing out the super-admin app role. Automatic mapping
   must not become a way around it: the mapping derives from the *subject's* own
   organization role, not from what the caller asks for. Make sure an internal /
   provisioning principal taking this path is deliberate and tested.

3. **Backfill: propose, do not run.** Existing assignments where the member is an
   org `super_admin`/`admin` but holds the default role need correcting. Write a
   one-off script under `scripts/`, dry-run by default, requiring `--apply`.
   **Do not execute it against any database.** Document how to run it in your
   report.

4. **Leave the 403 response shape alone.** Returning 403 with `Forbidden.` is
   correct behaviour for a genuine denial (`.claude/rules/access-control.md` —
   an API authorization failure answers with a status, it never redirects). The
   bug is upstream. You may improve the *client-side* message so a denied user is
   told they lack permission to comment rather than a bare "Forbidden.", but do
   not change the status code and do not fail open.

## Constraints

- Layer rules from `.claude/rules/express-api.md`: controllers do not touch
  Prisma; services do not touch Express `req`/`res`; only repositories import the
  Prisma client. `pnpm boundaries` must pass.
- Authorization changes fail **closed**. A mapping that cannot resolve a role
  falls back to the app's default role, never to a wider one.
- Do not rename any permission key, role key, table, or column.
- Do not run migrations against a live database. If a schema change is needed,
  write the migration file only.
- No `eslint-disable`, `@ts-ignore`, `as any`.
- Do not commit.

## Tests

Minimum 20 new `it()` cases:

- an org `super_admin` provisioned into a fresh app resolves the `super-admin`
  app role and holds `comments.create`;
- an org `admin` resolves `admin`;
- an ordinary member resolves the default role and does **not** hold
  `comments.create`;
- a member with no organization role resolves the default role;
- an app with no `super-admin` role falls back to default, not to admin;
- an app with no default role at all is handled without throwing;
- `requireSuperAdminForElevation` still rejects a non-super-admin caller
  explicitly requesting the super-admin app role;
- the mapping cannot widen an existing assignment on an unrelated update;
- a revoked or inactive assignment still resolves to `[]` effective permissions;
- the backfill script's dry run reports the right rows and writes nothing.

Assert full result shapes and exact call arguments, not `toBeDefined()`.

## Verify (foreground, read the output)

```bash
pnpm --filter @876/api typecheck && pnpm --filter @876/api lint && pnpm --filter @876/api boundaries && pnpm --filter @876/api test
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects test
```

## Report

Write to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-05-app-assignment-role-mapping.md`:
every assignment-creation path you found and how you unified them; the resolver's
exact fallback order; why the elevation guard is still sound; the backfill
script's location and dry-run output shape; the **counted** number of `it()`
cases added; verification output; and anything you could not verify.
