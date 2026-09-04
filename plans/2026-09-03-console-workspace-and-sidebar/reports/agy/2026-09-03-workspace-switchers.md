# Verification Report: Console Workspace Header (Switchers & Return Link)

**Date:** 2026-09-03  
**Package:** `@876/console` (`apps/console`)  
**Task:** Console workspace header — org switcher, app switcher, return link

---

## Files Changed

1. `apps/console/src/features/orgs/components/workspace-switchers.tsx` (CREATED)
   - Created client component hosting the workspace navigation controls: return link (resolving `?from=` with safe fallbacks via `resolveWorkspaceReturn`), organization switcher dropdown (retaining current workspace product key across organizations), and app switcher dropdown (switching product within current organization).
   - Styled with required verbatim classes and layout separators. Includes JSDoc documenting why the switchers exist.

2. `apps/console/src/features/orgs/components/workspace-switchers.test.tsx` (CREATED)
   - Created comprehensive Vitest + React Testing Library test suite with mocked `next/navigation` (`useSearchParams`) using the required hoisted ref pattern.
   - Contains **12** `it()` test cases covering all 10 required scenarios plus 2 supplementary assertions.

3. `apps/console/src/app/(app)/workspace/[orgSlug]/_components/workspace-header.tsx` (CREATED)
   - Created server component wrapping asynchronous data resolution in a `<Suspense fallback={<div className="h-7" />}>` boundary to stream chrome without blocking.
   - Resolves active organization, entitled workspaces, and active organizations (ensuring current organization is always included and sorted alphabetically by name).

4. `apps/console/src/app/(app)/workspace/[orgSlug]/_components/app-workspace-layout.tsx` (MODIFIED)
   - Wired `<WorkspaceHeader orgSlug={orgSlug} workspaceKey={workspaceKey} />` to render as the first element inside the layout shell above the entitlement notice and page content.

5. `apps/console/src/features/orgs/app-tabs.tsx` (MODIFIED)
   - Updated `orgTabs` so dynamic app tabs append `?from=${encodeURIComponent(base)}` to their hrefs, passing the organization detail entry point into the workspace.
   - Added comment explaining why the entry point is necessary now that workspaces live outside the organization record.

6. `apps/console/src/features/orgs/app-tabs.test.ts` (MODIFIED)
   - Updated expected dynamic app tab hrefs to include the `?from=%2Forgs%2Ftest-org` query parameter as instructed in the brief.

---

## Counted Test Cases Added

- **File:** `apps/console/src/features/orgs/components/workspace-switchers.test.tsx`
- **Total `it()` cases:** **12**
  1. `renders the organization name in the org trigger`
  2. `renders the workspace label in the app trigger`
  3. `the return link defaults to /orgs/acme labelled with the org name when there is no from`
  4. `the return link honours a valid from of /workspace/acme and reads All workspaces`
  5. `a hostile from of //evil.example falls back to /orgs/acme`
  6. `opening the org switcher lists every supplied organization`
  7. `an org switcher entry links to the same product under the other org (/workspace/globex/crm)`
  8. `the current organization is marked aria-current="page"`
  9. `opening the app switcher lists every supplied app, each linking to /workspace/acme/<key>`
  10. `the app switcher still renders its trigger and the All workspaces item when apps is empty`
  11. `marks the current workspace as aria-current="page" in the app switcher`
  12. `renders Browse all organizations link pointing to /orgs in the org switcher`

---

## Verification Command Outputs

### 1. Prettier

```bash
npx prettier --write "apps/console/src/features/orgs/components/workspace-switchers.tsx" "apps/console/src/features/orgs/components/workspace-switchers.test.tsx" "apps/console/src/app/(app)/workspace/[orgSlug]/_components/workspace-header.tsx" "apps/console/src/app/(app)/workspace/[orgSlug]/_components/app-workspace-layout.tsx" "apps/console/src/features/orgs/app-tabs.tsx"
```

**Output:**

```
apps/console/src/features/orgs/components/workspace-switchers.tsxapps/console/src/features/orgs/components/workspace-switchers.tsx 506ms (unchanged)
apps/console/src/features/orgs/components/workspace-switchers.test.tsxapps/console/src/features/orgs/components/workspace-switchers.test.tsx 213ms (unchanged)
apps/console/src/app/(app)/workspace/[orgSlug]/_components/workspace-header.tsxapps/console/src/app/(app)/workspace/[orgSlug]/_components/workspace-header.tsx 66ms (unchanged)
apps/console/src/app/(app)/workspace/[orgSlug]/_components/app-workspace-layout.tsxapps/console/src/app/(app)/workspace/[orgSlug]/_components/app-workspace-layout.tsx 49ms (unchanged)
apps/console/src/features/orgs/app-tabs.tsxapps/console/src/features/orgs/app-tabs.tsx 186ms (unchanged)
```

### 2. Typecheck

```bash
pnpm --filter @876/console typecheck
```

**Output:**

```
$ tsc --noEmit
```

_(Exited 0 with no errors)_

### 3. Lint

```bash
pnpm --filter @876/console lint
```

**Output:**

```
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

_(Exited 0 with 0 errors)_

### 4. Tests

```bash
pnpm --filter @876/console test
```

**Output:**

```
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/console

Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document

 Test Files  163 passed (163)
      Tests  1573 passed (1573)
   Start at  23:08:58
   Duration  235.06s (transform 17.69s, setup 70.14s, import 99.99s, tests 78.60s, environment 374.51s)
```

_(163 test files passed, 1573 tests passed, 0 failed)_

---

## Anything Could Not Do

None. All requirements, files, and verification steps succeeded completely.

---

## Decisions Not Settled by the Brief

1. **Empty `apps` dropdown contents:** The brief specified that when `apps` is empty, the trigger still renders `workspaceLabel` with only the `All workspaces` item beneath it. To keep the menu clean and avoid showing an empty "Apps" heading and orphan divider, `<DropdownMenuLabel>Apps</DropdownMenuLabel>` and `<DropdownMenuSeparator />` are omitted when `apps.length === 0`.
2. **Current organization fallback in `WorkspaceHeaderData`:** If `platform.organizations.list` returns an error or does not include the current organization (e.g. inactive or beyond limit), the current organization (`orgSlug` and `org?.name ?? orgSlug`) is guaranteed to be appended to the list before sorting so the organization trigger is never empty or unable to represent the current organization.
