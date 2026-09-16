# Verification Report: Console Workspaces Documentation

**Date:** 2026-09-04  
**File Created:** `docs/console-workspaces.md`  
**Task:** Write developer documentation for Console workspaces

---

## Summary of What Was Written

Created `docs/console-workspaces.md` adhering strictly to all style constraints (American spelling, roughly 80-column line wrapping, table formatting for enumerable structures, no wordy subheading paragraphs, no marketing adjectives, explicit product names `876 CRM`, `876 Billing`, `876 Invoice`, `876 Couriers`, and `876 Projects`, and using "organization" rather than "tenant").

The document covers:

1. **Overview**: Clear, concise definition of workspaces as operator views of organization operational data in specific 876 products.
2. **Where a workspace lives**:
   - Location at `/workspace/<orgSlug>/<appKey>` as a top-level Console context.
   - Historical location at `/orgs/<slug>/workspace/<app>` and 307 temporary redirects in `apps/console/next.config.ts`.
   - Launcher index at `/workspace/<orgSlug>`.
   - Summary path table.
3. **The workspace registry**:
   - Registry array `APP_WORKSPACES` in `apps/console/src/features/orgs/app-workspaces.ts`.
   - Table of registry entry properties (`appSlug`, `key`, `label`, `summary`, `iconKey`, `sections`, `navigationGroups`).
   - Table of all registered products (`876 CRM`, `876 Projects`, `876 Billing`, `876 Invoice`, `876 Couriers`).
   - Table of path and lookup helpers (`workspaceIndex`, `workspaceBase`, `findAppWorkspace`, `entitledWorkspaces`, `workspaceSectionLinks`).
   - Explicit rule: _Never hand-build a workspace URL — always use `workspaceBase`_.
4. **Entitlement is not access**:
   - Distinction between launcher/switcher visibility and operator data access.
   - Why lapsed workspaces remain accessible (data outlives subscriptions; operators often visit specifically to remediate lapsed states).
   - Streaming notice behavior with `<Suspense>`.
5. **Navigation**:
   - Full sidebar replacement upon entering a workspace, with no second rail inside the page.
   - Parallel route slots `@sidebar` and `@mobilenav` sharing resolver `resolveWorkspaceContexts` in `apps/console/src/features/orgs/workspace-contexts.ts`.
   - Required catch-alls (`[...section]`) avoiding collision with `/workspace/[orgSlug]`.
   - Context subtitle setting organization name.
   - Section icon resolution in `NAV_ICONS`.
   - Direct link to `apps/console/src/components/shell/README.md`.
6. **The workspace header**:
   - `WorkspaceSwitchers` component controls: return link, organization switcher, and app switcher.
   - Cross-organization switching retaining the current product.
   - Cross-product switching within the current organization.
   - Return link reading `?from=` appended by organization record tabs.
   - Safe same-origin validation rejecting `//`, backslashes, and control characters in `resolveWorkspaceReturn`.
   - Table of derived link labels based on destination.
7. **Adding a product**:
   - Numbered steps: registry entry in `APP_WORKSPACES`, icon key declaration in `NAV_ICONS` / `WORKSPACE_ICON_COLORS` (referencing test verification in `workspace-icon.test.tsx`), route folder setup, layout creation with `createWorkspaceLayout('<key>')`, and section page implementations.
8. **Related**:
   - Table of references to shell README, registry, ADR-017, ADR-018, and service workspace integration guide.

---

## Verification Command Outputs

### 1. Prettier Check

```bash
npx prettier --check docs/console-workspaces.md
```

**Output:**

```
Checking formatting...
docs/console-workspaces.md
All matched files use Prettier code style!
```

_(Exited with code 0)_

### 2. Git Status

```bash
git status --short
```

**Output:**

```
 M apps/console/src/app/(app)/@mobilenav/workspace/[orgSlug]/[...section]/page.tsx
 M apps/console/src/app/(app)/@sidebar/workspace/[orgSlug]/[...section]/page.tsx
 M apps/console/src/features/orgs/workspace-contexts.ts
 M apps/console/src/lib/auth/access-context.ts
 M apps/console/src/lib/permissions.ts
 M apps/crm-api/src/http/result.ts
 M apps/crm-api/src/http/routes.ts
 M apps/crm-api/src/modules/requests/requests.controller.ts
 M apps/crm-api/src/modules/requests/requests.repository.ts
 M apps/crm-api/src/modules/requests/requests.routes.ts
 M apps/crm-api/src/modules/requests/requests.schemas.ts
 M apps/crm-api/src/modules/requests/requests.service.ts
 M packages/crm/src/index.ts
 M packages/crm/src/operator.ts
 M packages/crm/src/request-types.ts
?? apps/console/src/lib/operator-permissions.ts
?? docs/console-workspaces.md
?? packages/crm/src/resources/operator-requests.ts
?? plans/2026-09-03-console-workspace-and-sidebar/briefs/agy/2026-09-04-console-workspaces-doc.md
?? plans/2026-09-03-console-workspace-and-sidebar/briefs/codex/
?? plans/2026-09-03-console-workspace-and-sidebar/reports/agy/2026-09-04-console-workspaces-doc.md
```

The only new documentation file attributable to this task is `docs/console-workspaces.md` (and this report). No code, configuration, or other architectural files were touched or modified.

---

## Anything Could Not Verify

None. Formatting passed cleanly and all required facts were cross-referenced against the codebase.
