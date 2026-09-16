# Requests and Projects Permission Keys

Date: 2026-09-04

## Files changed

- `apps/console/src/lib/auth/route-permissions.ts`
  - Changed `/projects` from `console:projects` to `projects/dashboard.view`.
  - Changed `/requests` from `console:requests` to `crm/requests.view`.
- `apps/console/src/components/shell/nav-config.ts`
  - Changed the Projects entry and its five children to
    `projects/dashboard.view`.
  - Changed the Requests entry and its three children to
    `crm/requests.view`.
- `apps/console/src/lib/auth/route-guard.ts`
  - Changed `requireConsoleCrmPermission` to require `crm/requests.view`.
- `apps/console/src/lib/auth/route-permissions.test.ts`
- `apps/console/src/lib/auth/route-permissions.comprehensive.test.ts`
- `apps/console/src/lib/auth/guard-coverage.test.ts`
- `plans/2026-09-03-console-workspace-and-sidebar/reports/codex/2026-09-04-requests-projects-permission-keys.md`

No files under `packages/core/src/access/`, operator-permission files, or the
cross-organization requests page were changed.

## Test assertion diffs

`route-permissions.test.ts`:

```diff
-      '/projects': 'console:projects',
+      '/projects': 'projects/dashboard.view',
...
-      '/requests': 'console:requests',
+      '/requests': 'crm/requests.view',
```

```diff
-    const catalog = new Set(
-      consolePermissionCatalog.permissions.map((permission) => permission.key)
-    )
+    const catalog = new Set([
+      ...consolePermissionCatalog.permissions.map(
+        (permission) => permission.key
+      ),
+      ...operatorProductCatalogs().flatMap((catalog) =>
+        catalog.permissions.map((permission) => permission.key)
+      ),
+    ])
```

The focused test run showed that the staff role now reaches `/projects` through
its existing projected `projects/dashboard.view` grant, so the exact assertion
was updated from:

```diff
-    expect(reachablePaths('staff')).toEqual(['/requests', '/reports'])
+    expect(reachablePaths('staff')).toEqual([
+      '/projects',
+      '/requests',
+      '/reports',
+    ])
```

`route-permissions.comprehensive.test.ts`:

```diff
-  it('maps /requests to console:requests (not support)', () => {
-    expect(ROUTE_PERMISSIONS['/requests']).toBe('console:requests')
+  it('maps /requests to crm/requests.view (not support)', () => {
+    expect(ROUTE_PERMISSIONS['/requests']).toBe('crm/requests.view')
```

The same test file had three assumptions invalidated by projected route keys;
these were revised without changing its unrelated `console:requests` plumbing
fixture:

```diff
-    const keys = new Set(consolePermissionCatalog.permissions.map((p) => p.key))
+    const keys = new Set([
+      ...consolePermissionCatalog.permissions.map(
+        (permission) => permission.key
+      ),
+      ...operatorProductCatalogs().flatMap((catalog) =>
+        catalog.permissions.map((permission) => permission.key)
+      ),
+    ])
...
-  it('legacy adaptation grants route access', () => {
+  it('legacy adaptation preserves a valid Console permission', () => {
     const adapted = toStoredPermissionKeys(['console:requests'])
-    const perm = ROUTE_PERMISSIONS['/requests']
+    const perm = 'console:requests'
...
-  it('each permission is colon-delimited (console tier)', () => {
+  it('each permission uses a Console or projected-product delimiter', () => {
     for (const perm of Object.values(ROUTE_PERMISSIONS))
-      expect(perm.includes(':')).toBe(true)
+      expect(perm.includes(':') || perm.includes('/')).toBe(true)
```

`guard-coverage.test.ts`:

```diff
-    expect(source).toContain("requireConsolePermission('console:requests')")
+    expect(source).toContain("requireConsolePermission('crm/requests.view')")
...
-    expect(source).not.toContain("'console:requests': 'requests")
+    expect(source).not.toContain("'crm/requests.view': 'requests")
```

Its literal-key comment was updated from `console:requests` to
`crm/requests.view` and no other prose was changed.

## Verification output

### `pnpm --filter @876/console typecheck`

Exit status: 0

```text
$ tsc --noEmit
```

### `pnpm --filter @876/console lint`

Exit status: 0

```text
$ eslint
```

### `pnpm --filter @876/console exec vitest run src/lib/auth src/components/shell/nav-config.test.ts --maxWorkers=1`

Exit status: 0

```text

 RUN  v4.1.11 /root/projects/876/apps/console
```

### `node scripts/check-app-structure.mjs`

Exit status: 0

```text
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```

### `npx prettier --write <every changed source/test file>`

Exit status: 0

```text
apps/console/src/lib/auth/route-permissions.ts 1431ms (unchanged)
apps/console/src/components/shell/nav-config.ts 6824ms (unchanged)
apps/console/src/lib/auth/route-guard.ts 273ms (unchanged)
apps/console/src/lib/auth/route-permissions.test.ts 394ms
apps/console/src/lib/auth/route-permissions.comprehensive.test.ts 100ms
apps/console/src/lib/auth/guard-coverage.test.ts 301ms (unchanged)
```

### `pnpm --filter @876/console test`

Exit status: 0 (pass). The captured Vitest output did not emit its final
pass/fail totals, so no count is inferred or fabricated.

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/console

Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document
```
