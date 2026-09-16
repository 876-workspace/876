# Verification Report: Console Projects Create Forms

## Files Changed and Rationale

| #   | File                                                                              | Action   | Rationale                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `apps/console/src/lib/client/projects.ts`                                         | Created  | Added browser client methods `projects.create` and `issues.create`, deriving types from `ProjectsOperatorClient` and encoding the organization ID in endpoint URLs.                                                                         |
| 2   | `apps/console/src/lib/client/index.ts`                                            | Modified | Registered `issues` and `projects` in alphabetical position in imports, exported client object, and named re-exports.                                                                                                                       |
| 3   | `apps/console/src/features/projects/components/project-create-form.tsx`           | Created  | Client component providing the Project creation form with validation, `AppError` integration, single `876-card` container (`max-w-2xl`), FormRow hints, status/health selection, uppercase key normalization, and post-creation navigation. |
| 4   | `apps/console/src/features/projects/components/issue-create-form.tsx`             | Created  | Client component providing the Issue creation form with empty project state fallback, project selector, FormRow layout, conditional status/priority mapping, and navigation to the new issue's identifier.                                  |
| 5   | `apps/console/src/features/projects/components/project-create-form.test.tsx`      | Created  | Unit tests verifying project form behavior: exact payload submission, key uppercase transformation, status/health selection, blank field guards, success navigation, and error handling.                                                    |
| 6   | `apps/console/src/features/projects/components/issue-create-form.test.tsx`        | Created  | Unit tests verifying issue form behavior: creator user ID inclusion, status/priority inclusion vs omission, project and title requirement validation, identifier navigation, failure handling, and empty project state rendering.           |
| 7   | `apps/console/src/app/(app)/projects/projects/new/page.tsx`                       | Modified | Server component page resolving platform projects organization ID and rendering `ProjectCreateForm`, preserving the existing Back link and metadata.                                                                                        |
| 8   | `apps/console/src/app/(app)/projects/issues/new/page.tsx`                         | Modified | Server component page resolving platform projects organization ID, session user, and project options via `projects.projects.list`, rendering `IssueCreateForm`.                                                                             |
| 9   | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/new/page.tsx` | Modified | Server component page resolving organization from route slug and rendering `ProjectCreateForm` with workspace base path.                                                                                                                    |
| 10  | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/new/page.tsx`   | Modified | Server component page resolving organization from route slug, session user, and project options, rendering `IssueCreateForm` with workspace base path.                                                                                      |

---

## Counted Number of `it()` Cases Added per File

- `apps/console/src/features/projects/components/project-create-form.test.tsx`: **9** `it()` cases
  1. `submits with the exact body for a name + key only`
  2. `upper-cases a lower-case key before sending`
  3. `includes status and health when they are chosen`
  4. `does not call client.projects.create when the name is blank`
  5. `does not call client.projects.create when the key is blank`
  6. `navigates to the new project detail route and calls refresh exactly once on success`
  7. `renders the error message and does not navigate when the result carries an error`
  8. `includes description when filled`
  9. `navigates back to the projects list when Cancel is clicked`

- `apps/console/src/features/projects/components/issue-create-form.test.tsx`: **10** `it()` cases
  1. `submits the exact body including creatorUserId when required fields are filled`
  2. `omits status and priority when untouched`
  3. `includes status and priority when chosen`
  4. `does not submit with no project selected`
  5. `does not submit with a blank title`
  6. `navigates to the identifier on success, not the id`
  7. `renders the error and does not navigate on failure`
  8. `renders the "Create a project before opening an issue." empty state, with no form controls, when projects is []`
  9. `includes description when filled`
  10. `navigates back to the issues list when Cancel is clicked`

**Total `it()` test cases added**: **19**

---

## Verification Output

### 1. `pnpm --filter @876/console typecheck`

```
$ tsc --noEmit
```

(Exit code: 0)

### 2. `pnpm --filter @876/console lint`

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

/root/projects/876/apps/console/src/app/(app)/orgs/[slug]/_data.ts
  1:10  warning  'billing' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/(app)/orgs/[slug]/billing/accounts/[accountId]/edit/page.tsx
  1:10  warning  'billing' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/(app)/orgs/[slug]/members/_components/member-detail.tsx
  71:8  warning  '_now' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/(list)/page.tsx
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

/root/projects/876/apps/console/src/components/shell/user-menu.tsx
  17:5  warning  Do not use `window.location.href` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/console/src/features/orgs/components/workspace-shell.tsx
  80:3  warning  'orgSlug' is defined but never used  @typescript-eslint/no-unused-vars

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

(Exit code: 0; 0 errors; no issues in any modified or created files)

### 3. `pnpm --filter @876/console test`

```
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/console

Not implemented: navigation to another Document
Not implemented: navigation to another Document

 Test Files  153 passed (153)
      Tests  1477 passed (1477)
   Start at  12:46:18
   Duration  100.84s (transform 8.76s, setup 29.58s, import 40.51s, tests 34.43s, environment 161.16s)
```

(Exit code: 0; baseline was 151 files / 1458 tests passing; increased to 153 files / 1477 tests passing, exactly +19 tests)

---

## Anything Not Done and Why

None. All required files were created or rewritten per specifications, all constraints (no git staging/commit commands, single quotes, no semicolons, no `as any`, no `@ts-ignore` or `eslint-disable`) were adhered to, and all verification checks passed cleanly.
