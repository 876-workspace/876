# Task: write `docs/console-workspaces.md`

Repo: `/root/projects/876`. **Documentation only. Do not change a single line of
code. Do not create branches. Do not commit.**

## Files

| #   | Path                        | Action                        |
| --- | --------------------------- | ----------------------------- |
| 1   | `docs/console-workspaces.md` | CREATE                        |

## Files you must NOT touch

- any `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, `.prisma` file — **anything that is code**
- `docs/architecture/017-console-app-data-management.md`
- `docs/architecture/018-product-entitlements-and-service-workspaces.md`
- the repo-root `README.md`
- `apps/console/src/components/shell/README.md`
- anything under `plans/`
- anything under `apps/` or `packages/`

Read whatever you need in order to be accurate. Write only file #1.

## What to document — these are verified facts, use them

**1. Where a workspace lives.** An organization's product workspace is at
`/workspace/<orgSlug>/<appKey>` — a top-level Console context. It used to be
`/orgs/<slug>/workspace/<app>`, a tab inside the organization record. Old URLs
redirect temporarily (307) via `redirects()` in `apps/console/next.config.ts`.
`/workspace/<orgSlug>` on its own is the **launcher index**, listing the products
that organization is entitled to.

**2. The registry.** `apps/console/src/features/orgs/app-workspaces.ts` declares
`APP_WORKSPACES` — one entry per product with `appSlug`, `key`, `label`,
`summary`, `iconKey` and its `sections`. Path helpers: `workspaceIndex(orgSlug)`,
`workspaceBase(orgSlug, workspaceKey)`, `findAppWorkspace(key)`,
`entitledWorkspaces(slugs)`, `workspaceSectionLinks(orgSlug, workspace)`.
**Never hand-build a workspace URL — always use `workspaceBase`.**

**3. Entitlement vs access.** `entitledWorkspaces` decides what the launcher
lists and what the app switcher offers. It does **not** decide what an operator
may read: a direct visit to a workspace whose entitlement lapsed still resolves,
with a notice, because the data outlives the subscription and an operator is
usually there precisely because something lapsed.

**4. The rail.** Entering a workspace swaps Console's whole sidebar to that
product's navigation. There is no second rail inside the page. The contexts come
from two parallel route slots — `@sidebar` and `@mobilenav` — which share one
resolver per segment so the desktop rail and the mobile sheet cannot disagree.
Full detail lives in `apps/console/src/components/shell/README.md`; **link to it
rather than restating it**.

**5. The header.** Every workspace page carries a return link, an organization
switcher and an app switcher. The organization switcher keeps the operator in
the *same product* across organizations; the app switcher moves between products
for the *same organization*. The return link reads `?from=`, which the
organization record appends to its app tabs; the resolver rejects any
destination that leaves the origin and derives the link's label rather than
accepting one.

**6. Adding a product to the workspace surface.** Numbered steps: add an entry
to `APP_WORKSPACES`; add its sections with `iconKey` values that exist in
`NAV_ICONS`; create the routes under
`apps/console/src/app/(app)/workspace/[orgSlug]/<key>/`; use
`createWorkspaceLayout('<key>')` for the layout. Note that a section's `iconKey`
must be declared in `apps/console/src/components/shell/nav-icons.tsx` or it
silently falls back to a generic square — there is a test that catches this.

## Style rules — this repo is strict about prose

- **No wordy subheading paragraphs.** Do not write an explanatory sentence under
  a heading restating what the section below already shows. A bare heading is
  enough.
- Use tables for anything enumerable.
- Prefer short declarative sentences. No marketing tone, no "powerful",
  "seamless", "robust", "simply".
- Use `876 CRM`, `876 Billing`, `876 Invoice`, `876 Couriers`, `876 Projects` —
  never bare "CRM"/"Billing" as a product name.
- Say **organization** (or **org**), never "tenant", when referring to an 876
  organization. "Tenant" in CRM/Couriers means that app's own row.
- Use `Console`, capitalized, for the admin app.
- Fenced code blocks need a language tag (```text, ```ts, ```bash).
- Wrap prose at roughly 80 columns.
- American spelling.

## Structure to follow

```markdown
# Console workspaces

<one or two sentences: what a workspace is and who uses it>

## Where a workspace lives

## The workspace registry

## Entitlement is not access

## Navigation

## The workspace header

## Adding a product

## Related
```

## Verification

```bash
cd /root/projects/876
npx prettier --check docs/console-workspaces.md
```

It must pass. If it does not, run `npx prettier --write docs/console-workspaces.md`
and check again.

Then confirm you changed nothing else:

```bash
git status --short
```

The only new entry attributable to you must be `docs/console-workspaces.md`.
Other files will already be modified by other agents — leave them alone and do
not report them as yours.

## Report

Write to
`plans/2026-09-03-console-workspace-and-sidebar/reports/agy/2026-09-04-console-workspaces-doc.md`:
what you wrote, the `prettier --check` output, the `git status --short` output,
and anything you could not verify.
