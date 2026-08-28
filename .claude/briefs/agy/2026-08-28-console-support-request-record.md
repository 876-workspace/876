# Give Console's support request page the CRM record layout

## Orchestrator note (not an instruction to you)

This brief is executed by you, the delegate. Do not shell out to another agent.
Do not commit.

## The goal

Console's own support desk (`/support`) shows a request detail page that looks
nothing like the one the CRM product itself ships. 876 uses its own product, so
the two should read as the same screen.

Make `apps/console/src/app/(app)/support/[requestId]/` adopt the **tabbed record
layout** that `apps/crm` already uses for a request.

## The reference — read these first, they are the spec

```
apps/crm/src/app/(app)/requests/[requestId]/(record)/layout.tsx     ← the shell
apps/crm/src/app/(app)/requests/[requestId]/(record)/page.tsx       ← Conversation
apps/crm/src/app/(app)/requests/[requestId]/(record)/customer/page.tsx
apps/crm/src/app/(app)/requests/[requestId]/(record)/tasks/page.tsx
apps/crm/src/app/(app)/requests/[requestId]/(record)/reminders/page.tsx
apps/crm/src/app/(app)/requests/[requestId]/(record)/audit/page.tsx
apps/crm/src/app/(app)/requests/[requestId]/_components/request-identity.tsx
apps/crm/src/app/(app)/requests/[requestId]/_components/request-aside.tsx
apps/crm/src/app/(app)/requests/[requestId]/_components/section-placeholder.tsx
```

The shape to reproduce:

- a toolbar spanning the record, streamed behind its own fallback;
- below it two columns — `lg:grid-cols-[minmax(0,1fr)_340px]`;
- left column: the identity band (subject, number, badges) streamed behind its
  own fallback, then a `RouteTabs` strip, then `{children}`;
- right column: a sticky customer/details aside, streamed behind its own
  fallback;
- tabs: `Conversation` (exact, the index), `Customer`, `Tasks`, `Reminders`,
  `Audit`.

## What Console currently has

`apps/console/src/app/(app)/support/[requestId]/page.tsx` renders a single
`RequestManager` from `apps/console/src/features/support/components/request-manager.tsx`,
which fetches the request, tasks, reminders and notes together and stacks them.

Keep `RequestManager` working for the **organization** route
(`/orgs/[slug]/requests/[requestId]`) — that page must not change or break.
Only `/support/[requestId]` gains the record layout.

## Hard constraints — these are not style preferences

1. **Console must not import from `apps/crm`.** They are separate apps.
   Re-create the components under
   `apps/console/src/features/support/components/`. Copy the structure and the
   classNames; do not add a cross-app import.

2. **The layout awaits `params` and nothing else.** Read
   `.claude/rules/navigation-performance.md` Rule 2. A layout that awaits data
   suspends into the *parent* segment's boundary, so the click lands back on the
   list. Build the tab strip from `requestId` alone so it is real and clickable
   immediately; stream every data region behind its own `<Suspense>`.

3. **Resolve the organization with `getPlatformOrganization()`** from
   `@/lib/platform-org` (already exists, `React.cache`d). When it returns null,
   render the existing `PlatformOrganizationUnavailable` component rather than
   throwing.

4. **`notFound()` moves into the streamed component** that resolves the record,
   because that is where the record is known. It cannot be called from a client
   component.

5. Data comes from `$876.requests.*`, `$876.requestTasks.*`,
   `$876.requestReminders.*`, `$876.requestNotes.*` — the same operator-tier
   verbs the current page uses. Do not add a client method.

6. Route files only in route directories: `layout.tsx`, `page.tsx` and the
   nested section `page.tsx` files. Every component goes in
   `features/support/components/`. See `.claude/rules/app-structure.md`.

7. **Do not** add `eslint-disable`, `as any`, a server action, or a
   `proxy.ts`/`middleware.ts`.

8. **Do not touch** `apps/console/src/app/(app)/orgs/[slug]/_components/org-tabs.tsx`,
   `apps/console/src/app/(app)/orgs/[slug]/layout.tsx`, or anything under
   `apps/console/src/features/orgs/` — another task owns those files right now.

## Audit tab

Console has no audit feed for a CRM request yet. Render the section with the
`SectionPlaceholder` equivalent (an empty state saying it is not available yet).
Do not invent an endpoint.

## Verification — run these and paste the real output

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

Report every file you created and changed.
