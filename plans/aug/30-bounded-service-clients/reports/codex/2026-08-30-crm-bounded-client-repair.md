# CRM bounded-client repair

## Result

CRM now typechecks with zero errors. No tests were deleted or skipped: the first successful verification run and final captured run both reported **213 passed tests**.

## Defect classes resolved

1. **Missing `Crm*` names:** `apps/crm/src/types/crm.ts` now owns the complete alias block formerly exported by `@876/client`. Browser transport modules import those aliases from `@/types/crm`, not the raw CRM package.
2. **Removed `customerProfiles` projection:** every use now targets `crm.customers`. I verified the bounded resource keeps the required argument order and envelope: `list(organizationId, options)`, `retrieve(organizationId, id)`, `create(organizationId, input)`, `update(organizationId, id, input)`, and `delete(organizationId, id, input)`.
3. **Implicit-any fallout:** restoring concrete aliases and the correctly typed `crm.customers` source expressions restored map/destructuring inference. No explicit `any`, `@ts-expect-error`, or `as any` was added.
4. **Deleted facade in routes:** all seven listed handlers now use `crm` from `@/lib/services/crm`. Their session checks, actor fields, envelopes, and status mapping were retained.

`apps/crm/src/lib/services/crm.ts` also lazily constructs its service singleton through explicit resource getters. It does not use a proxy, does not read/throw for `CRM_INTERNAL_KEY` at module evaluation, and retains the runtime error message `CRM_INTERNAL_KEY is required`.

## CRM exports

No `@876/crm` export was added. Every name in the old `@876/client` CRM alias block has a counterpart in `@876/crm`; there are no missing aliases to report.

## Changed files

- `apps/crm/next.config.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/(app)/customers/[customerId]/_components/customer-card-frame.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/(app)/customers/[customerId]/edit/page.tsx` — use `crm.customers.retrieve` and normalize formatting.
- `apps/crm/src/app/(app)/customers/_lib/customers-data.ts` — use the bounded customers list type/source and normalize formatting.
- `apps/crm/src/app/(app)/forms/page.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/(app)/layout.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/(app)/requests/[requestId]/(record)/layout.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/(app)/requests/[requestId]/_data.ts` — use `crm.customers.retrieve` and normalize formatting.
- `apps/crm/src/app/(app)/requests/[requestId]/edit/page.tsx` — use `crm.customers.list` and normalize formatting.
- `apps/crm/src/app/(app)/requests/new/page.tsx` — use `crm.customers.list` and normalize formatting.
- `apps/crm/src/app/(app)/requests/page.tsx` — use `crm.customers.list` and normalize formatting.
- `apps/crm/src/app/(app)/settings/categories/page.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/(app)/settings/priorities/page.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/(app)/settings/teams/[teamId]/edit/page.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/(app)/settings/teams/[teamId]/page.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/(app)/settings/teams/page.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/customers/route.ts` — replace deleted facade and customer-profile projection with `crm.customers`.
- `apps/crm/src/app/api/customers/[customerId]/route.ts` — replace deleted facade and customer-profile projection with `crm.customers`.
- `apps/crm/src/app/api/request-categories/[categoryId]/route.ts` — replace deleted facade with the CRM service singleton and normalize formatting.
- `apps/crm/src/app/api/request-categories/[categoryId]/subcategories/route.ts` — replace deleted facade with the CRM service singleton.
- `apps/crm/src/app/api/request-categories/[categoryId]/subcategories/[subcategoryId]/route.ts` — replace deleted facade with the CRM service singleton.
- `apps/crm/src/app/api/teams/[teamId]/members/route.ts` — replace deleted facade with the CRM service singleton.
- `apps/crm/src/app/api/teams/[teamId]/members/[userId]/route.ts` — replace deleted facade with the CRM service singleton and normalize formatting.
- `apps/crm/src/app/api/support/route.ts` — use the bounded customers resource and normalize formatting.
- `apps/crm/src/app/api/request-categories/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/request-priorities/[priorityId]/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/request-priorities/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/events/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/events/[eventId]/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/events/[eventId]/participants/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/events/[eventId]/participants/[participantId]/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/notes/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/notes/[noteId]/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/reminders/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/reminders/route.test.ts` — Prettier normalization required for the repository formatting check; no assertion changed.
- `apps/crm/src/app/api/requests/[requestId]/reminders/[reminderId]/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/reminders/[reminderId]/route.test.ts` — Prettier normalization required for the repository formatting check; no assertion changed.
- `apps/crm/src/app/api/requests/[requestId]/tasks/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/tasks/route.test.ts` — Prettier normalization required for the repository formatting check; no assertion changed.
- `apps/crm/src/app/api/requests/[requestId]/tasks/[taskId]/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/requests/[requestId]/tasks/[taskId]/route.test.ts` — Prettier normalization required for the repository formatting check; no assertion changed.
- `apps/crm/src/app/api/teams/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/api/teams/route.test.ts` — Prettier normalization required for the repository formatting check; no assertion changed.
- `apps/crm/src/app/api/teams/[teamId]/route.ts` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/login/_components/embedded-auth.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/app/register/_components/registration-auth.tsx` — Prettier normalization required for the repository formatting check.
- `apps/crm/src/lib/client/customers.ts` — import CRM aliases from the app-local type contract and normalize formatting.
- `apps/crm/src/lib/client/request-categories.ts` — import CRM aliases from the app-local type contract and normalize formatting.
- `apps/crm/src/lib/client/request-events.ts` — import CRM aliases from the app-local type contract and normalize formatting.
- `apps/crm/src/lib/client/request-priorities.ts` — import CRM aliases from the app-local type contract and normalize formatting.
- `apps/crm/src/lib/client/request-reminders.ts` — import CRM aliases from the app-local type contract and normalize formatting.
- `apps/crm/src/lib/client/request-tasks.ts` — import CRM aliases from the app-local type contract and normalize formatting.
- `apps/crm/src/lib/client/requests.ts` — import CRM aliases from the app-local type contract and normalize formatting.
- `apps/crm/src/lib/client/support.ts` — import CRM aliases from the app-local type contract and normalize formatting.
- `apps/crm/src/lib/client/teams.ts` — import CRM aliases from the app-local type contract and normalize formatting.
- `apps/crm/src/lib/services/crm.ts` — lazily initialize the internal-key CRM singleton through explicit resource getters.
- `apps/crm/src/types/crm.ts` — restore the full old-facade CRM alias mapping from `@876/crm`.

## Verification

### `pnpm --filter @876/crm typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/crm-app typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/crm-app lint`

```text
$ eslint

/root/projects/876/apps/crm/src/app/(app)/customers/_components/customer-create-card.tsx
  5:25  warning  'parsePhone' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/crm/src/app/(app)/customers/_components/customer-mails-tab.tsx
  9:13  warning  '_customer' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/crm/src/app/(app)/customers/_components/customer-requests-tab.tsx
  17:13  warning  '_customer' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/crm/src/app/(app)/customers/_components/customer-statement-tab.tsx
  17:13  warning  '_customer' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/crm/src/app/(app)/customers/_components/customer-transactions-tab.tsx
  16:13  warning  '_customer' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/crm/src/app/login/_components/embedded-auth.tsx
  48:13  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/crm/src/app/register/_components/registration-auth.tsx
  28:13  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/crm/src/components/shell/org-switcher.tsx
  31:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/crm/src/components/shell/shell.tsx
  29:3  warning  'orgName' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/crm/src/components/shell/user-menu.tsx
  19:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

✖ 10 problems (0 errors, 10 warnings)
```

### `pnpm --filter @876/crm-app test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/crm


 Test Files  27 passed (27)
      Tests  213 passed (213)
   Start at  23:01:40
   Duration  90.29s (transform 4.92s, setup 21.22s, import 45.58s, tests 60.42s, environment 111.28s)
```

### `npx prettier --check "apps/crm/**/*.{ts,tsx}"`

```text
Checking formatting...
All matched files use Prettier code style!
```

### `grep -rn "eslint-disable\|as any\|@876/client\|get876Client\|customerProfiles" apps/crm/src`

```text

```

The grep command produced no output (and therefore its normal exit status of 1).

## Unresolved items

None. A transient test retry was blocked while another workspace process was updating the already-dirty root lockfile; once that process completed, the final CRM test command passed 213/213.
