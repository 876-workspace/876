# Console team PATCH role hardening

## Status

1. Complete — `teamGrantUpdateSchema` now trims and restricts `roleName` to
   `ASSIGNABLE_ROLES`, while preserving and normalizing `super_admin` to
   `super-admin`. The PATCH handler returns `team/role-invalid` for a
   role-specific parse error before authorization or service invocation.
2. Complete — removed the explanatory Console Access paragraph.
3. Complete — all six labelled grant controls use `FormRow`; expiry and
   justification are marked required when the affiliation is not staff.
4. Complete — the page passes the viewer's canonical role and the editor only
   offers Super Admin to super-admin viewers. The server guard remains intact.
5. Complete — expanded route/editor regression coverage, including conditional
   grant fields, exact mutation payloads, no-op saving, retained error state,
   permission-disabled controls, and role-option visibility.

## Files changed

- `apps/console/src/types/team.ts` — allowlisted and canonicalized PATCH role
  input at the schema boundary.
- `apps/console/src/app/api/team/[id]/route.ts` — maps invalid role parsing to
  the registered `team/role-invalid` response.
- `apps/console/src/app/api/team/[id]/route.test.ts` — regression coverage for
  invalid roles, alias normalization, assignable roles, and escalation denial.
- `apps/console/src/app/(app)/settings/users/(team)/[id]/_components/grant-editor.tsx`
  — applies `FormRow`, removes prohibited copy/fallback prose, and filters the
  Super Admin option using caller authority.
- `apps/console/src/app/(app)/settings/users/(team)/[id]/_components/grant-editor.test.tsx`
  — adds editor behavior and negative-space coverage.
- `apps/console/src/app/(app)/settings/users/(team)/[id]/page.tsx` — passes the
  canonical viewer role to the editor.

Added test cases: **14** total (7 route cases, with the assignable-role matrix
expanding to four executions, and 7 editor cases). The focused tests report
26 passing cases across the two files.

## Verification

`pnpm --filter @876/console typecheck` and
`pnpm --filter @876/console lint` exited 0. Verbatim output:

```text
$ tsc --noEmit
$ eslint

/root/projects/876/apps/console/src/app/(app)/apps/[slug]/(overview)/page.tsx
  1:10  warning  'billing' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/(app)/apps/[slug]/plans/[planSlug]/subscribers/page.tsx
   1:10  warning  'billing' is defined but never used            @typescript-eslint/no-unused-vars
  98:11  warning  'slug' is assigned a value but never used      @typescript-eslint/no-unused-vars
  98:17  warning  'planSlug' is assigned a value but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/(app)/billing/page.tsx
  1:10  warning  'billing' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/(app)/orgs/[slug]/billing/accounts/[accountId]/edit/page.tsx
  1:10  warning  'billing' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/(app)/orgs/[slug]/members/_components/member-detail.tsx
  71:8  warning  '_now' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/(app)/workspace/[orgSlug]/crm/customers/(list)/page.tsx
  2:10  warning  'notFound' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/access-denied/_components/access-denied-actions.tsx
  21:7  warning  Do not use `window.location.href` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/console/src/app/api/billing-accounts/[accountId]/route.ts
  1:10  warning  'billing' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/api/billing-accounts/route.ts
  1:10  warning  'billing' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/api/organizations/[id]/customers/route.ts
  1:10  warning  'billing' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/api/organizations/[id]/members/search/route.ts
  14:3  warning  '_context' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/components/shell/sidebar-slots.ts
  64:23  warning  '_requires' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/components/shell/user-menu.tsx
  17:5  warning  Do not use `window.location.href` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/console/src/features/orgs/org-data.ts
  1:10  warning  'billing' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/lib/auth/route-guard.ts
  114:3  warning  '_organizationId' is defined but never used  @typescript-eslint/no-unused-vars
  115:3  warning  '_crmOperation' is defined but never used    @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/lib/billing/mirror.test.ts
  1:10  warning  'billingOperator' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/lib/errors/index.ts
  2:10  warning  'HttpStatus' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/lib/platform-org.ts
  5:10  warning  'workspace' is defined but never used  @typescript-eslint/no-unused-vars

✖ 21 problems (0 errors, 21 warnings)
```

Focused regression run, which exited 0:

```text

 RUN  v4.1.11 /root/projects/876/apps/console


 Test Files  2 passed (2)
      Tests  26 passed (26)
   Start at  19:48:41
   Duration  4.19s (transform 752ms, setup 434ms, import 1.66s, tests 1.99s, environment 1.76s)
```

`pnpm --filter @876/console test` output (exit 1):

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/console

 ❯ src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx (12 tests | 1 failed) 368ms
     × produces stable snapshot for full billing summary (golden master) 16ms
Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx > SubscriptionBillingSummary / Frontend Component / advanced > produces stable snapshot for full billing summary (golden master)
Error: The snapshot state for '/root/projects/876/apps/console/src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx' is not found. Did you call 'SnapshotClient.setup()'?
 ❯ src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx:227:33


⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 172 passed (173)
      Tests  1 failed | 1705 passed (1706)
   Start at  19:48:49
   Duration  113.24s (transform 8.00s, setup 34.73s, import 45.11s, tests 43.15s, environment 176.52s)

/root/projects/876/apps/console:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/console@0.1.0 test: `vitest run`
Exit status 1
```

## Could not verify

The full Console suite cannot exit cleanly because of the one documented,
unrelated billing snapshot-state failure above. All other test files (172) and
test cases (1,705) passed. No commit was created.
