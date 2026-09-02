# Entitlement-driven organization tabs in Console

## Orchestrator note (not an instruction to you)

This brief is executed by you, the delegate. Do not shell out to another agent.

## The problem

`apps/console/src/app/(app)/orgs/[slug]/_components/org-tabs.tsx` returns a
hardcoded list of nine tabs for every organization. So Console shows a
"Requests" tab to an organization that is not entitled to 876 CRM, and a
"Billing" tab to one with no Billing entitlement. Clicking either lands on an
empty or erroring page.

It also means adding a future app to Console's org view is a layout edit, which
is exactly what we want to stop doing.

## What to build

Make the tab strip **driven by the organization's app entitlements**, while
keeping every tab that is not app-specific always present.

### 1. A registry of app-owned tabs

Create `apps/console/src/features/orgs/app-tabs.ts` containing plain data:

```ts
/** A tab shown only when the organization is entitled to the owning app. */
export type AppOwnedTab = {
  /** The platform app slug that gates this tab, e.g. '876-crm'. */
  appSlug: string
  label: string
  /** Path segment appended to the org base, e.g. 'requests'. */
  segment: string
}

export const APP_OWNED_TABS: AppOwnedTab[] = [
  { appSlug: '876-crm', label: 'Requests', segment: 'requests' },
  { appSlug: '876-billing', label: 'Billing', segment: 'billing' },
  // add future apps here — one line each, no layout change
]
```

Do **not** put React components or functions in this file. It is data.

### 2. Change `orgTabs` to take the entitled slugs

```ts
export function orgTabs(
  base: string,
  entitledAppSlugs: readonly string[]
): RouteTabItem[]
```

- Always present, in this order: `Overview`, `Members`, `Customers`,
  `Subscriptions`, `Onboarding`, `Activity`, `Notes`.
- Each `APP_OWNED_TABS` entry is inserted **only** when `entitledAppSlugs`
  contains its `appSlug`.
- Preserve the current visual order: `Requests` sits after `Customers`, and
  `Billing` sits after `Onboarding`.
- The existing second parameter `_slug` is unused — remove it.

### 3. Resolve the entitlements in the layout

`apps/console/src/app/(app)/orgs/[slug]/layout.tsx` calls `orgTabs`. It must now
pass the org's entitled app slugs.

**Read `.claude/rules/navigation-performance.md` Rule 2 first — it is the whole
point of this task.** That layout must await `params` and nothing else, because
anything else it awaits suspends into the *parent* segment's boundary and the
click lands back on the organizations list.

So: render the tab strip inside its own `<Suspense>`, with the **always-present
tabs as the fallback** — real, clickable tabs, never a skeleton, and never a tab
that later disappears. The streamed component resolves the entitlements and
renders the full strip.

Find how entitlements are read — the subscriptions/entitlements surface already
exists on the Console facade (`apps/console/src/lib/876/index.ts`, and
`.claude/rules/workspace-control-plane.md` describes
`workspace.apps.entitlements`). Use the existing method; do not add a new client
method. Only `active`/`trialing` entitlements count as entitled.

### 4. Tests

Add `apps/console/src/features/orgs/app-tabs.test.ts` covering:
- no entitlements → exactly the seven always-present tabs, in order;
- `876-crm` only → Requests present, Billing absent;
- `876-billing` only → Billing present, Requests absent;
- both → the full strip in the original visual order;
- an unknown slug in the entitlement list changes nothing.

Update any existing test that calls `orgTabs` with the old signature.

## Hard rules

- Do **not** touch anything under `apps/console/src/app/(app)/support/` or
  `apps/console/src/components/shell/nav-config.ts` — another task owns those
  files right now.
- Do **not** add `eslint-disable` or `as any`.
- Do **not** commit.

## Verification — run these and paste the real output

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
```
