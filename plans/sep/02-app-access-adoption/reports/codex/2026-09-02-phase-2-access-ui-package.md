# Phase 2 — `@876/access-ui`

## Attribution

- **GPT-5.6 Terra** implemented the original shared package, its 46 test cases,
  package registration, and the host-facing access contracts described below.
- **GPT-5.6 Sol** reviewed the implementation against the Phase 2 brief and the
  Phase 3 host adoption. Sol fixed a mutation race in which controls appeared
  enabled while another mutation caused their clicks to be silently discarded.
  Mutations are now serialized per app entry, controls expose their disabled
  state while a save is pending, and first assignment waits for the server-issued
  assignment ID before overrides become available. A failed assignment remains
  selected and retryable. Sol added three regression tests.

## Files

| File                                                    | Change                                                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/access-ui/package.json`                       | New private raw-TSX workspace package with explicit component/type exports and only `@876/core` / `@876/ui` workspace dependencies.             |
| `packages/access-ui/tsconfig.json`                      | Mirrors `@876/crm-ui`.                                                                                                                          |
| `packages/access-ui/vitest.config.ts`                   | Mirrors `@876/crm-ui`.                                                                                                                          |
| `packages/access-ui/src/types.ts`                       | Defines host-owned view contracts without a platform or service-client dependency.                                                              |
| `packages/access-ui/src/app-access-panel.tsx`           | Client panel for role assignment, overrides, inline mutation errors, optimistic reconciliation, and authoritative effective-permission display. |
| `packages/access-ui/src/effective-permissions.tsx`      | Read-only grouped effective-permission list with stale-key handling.                                                                            |
| `packages/access-ui/src/app-access-summary.tsx`         | Compact per-app, read-only member summary.                                                                                                      |
| `packages/access-ui/src/app-access-panel.test.tsx`      | Panel behavior coverage.                                                                                                                        |
| `packages/access-ui/src/effective-permissions.test.tsx` | Effective-list coverage.                                                                                                                        |
| `packages/access-ui/src/app-access-summary.test.tsx`    | Summary coverage.                                                                                                                               |
| `packages/access-ui/src/security-corpus.test.tsx`       | Four security matrices over hostile app, role, permission, and module strings.                                                                  |
| `scripts/shared-ui-packages.mjs`                        | Adds `@876/access-ui` to the central transpilation list.                                                                                        |
| `pnpm-lock.yaml`                                        | Links the new workspace package.                                                                                                                |

## Test counts

| Test file                        | `it()` / `it.each()` declarations |                    Generated cases |
| -------------------------------- | --------------------------------: | ---------------------------------: |
| `app-access-panel.test.tsx`      |                                23 |                                 23 |
| `effective-permissions.test.tsx` |                                 6 |                                  6 |
| `app-access-summary.test.tsx`    |                                 4 |                                  4 |
| `security-corpus.test.tsx`       |                                 4 | 16 (four corpus values per matrix) |
| **Total**                        |                            **37** |                             **49** |

## Verification

| Command                                  | Result | Output tail                                                                                      |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `pnpm install`                           | Pass   | `Scope: all 38 workspace projects`<br>`Already up to date`<br>`Done in 596ms using pnpm v11.3.0` |
| `pnpm --filter @876/access-ui typecheck` | Pass   | `$ tsc --noEmit`                                                                                 |
| `pnpm --filter @876/access-ui test`      | Pass   | Sol final verification: `Test Files  4 passed (4)`<br>`Tests  49 passed (49)`                    |
| `pnpm check:transpile`                   | Pass   | `$ node scripts/check-shared-ui-transpile.mjs`<br>`shared-ui-transpile: OK`                      |

The first `pnpm install` invocation was blocked by the environment's frozen-lockfile setting because the newly created workspace package was not yet in `pnpm-lock.yaml`. I ran `pnpm install --no-frozen-lockfile` to create the required lockfile entry, then reran the requested exact `pnpm install` command successfully above.

## Judgement calls

- Added an explicit `./types` package export. Hosts need to name `AccessAppEntry` and related callback contract types; it is a per-file export, not a barrel or wildcard.
- The host contract intentionally carries a flattened live catalog. `@876/core/access`'s `groupByModule` requires a structured `AppPermissionCatalog`, so the UI preserves the supplied flattened catalog order when grouping rather than inventing a lossy catalog adapter.
- The panel renders only API-returned `effectivePermissions`. It does not call `resolveEffectivePermissions` for an unsaved preview, avoiding a client-side value that could be mistaken for the authoritative saved result.
- An unassigned app presents a role chooser plus a blue `Assign` action. After the mutation begins, the local optimistic profile shows that role; returned errors render inline and retain the panel and selected values until the host supplies fresh entries.
- Override edits normalize the selected key out of both arrays before adding/removing it, so callback payloads cannot contain the same key in grants and denies.
- Per-app mutations are serialized. After a first assignment succeeds, override
  controls wait for refreshed server props to supply the durable assignment ID;
  a failed first assignment keeps the chosen role and allows retry.
- “Dangerous” uses the warning badge. No interactive control adds a green class; the panel suite asserts this.

## Limitations and contradictions

- Nothing was left incomplete within this phase. Host adoption is deliberately not included: the brief expressly forbids edits to Console, CRM, Billing, Invoice, their APIs, `@876/ui`, and `@876/core`.
- No contradiction prevented implementation. The requested dependency list differs from `@876/crm-ui`'s product-specific dependency; I treated the explicit `@876/core` and `@876/ui` dependency requirement as controlling while copying CRM UI peer dependencies, dev dependencies, and scripts verbatim.
- Final worktree inspection also found concurrent, unrelated modifications in `packages/core/src/access/catalogs.ts` and `packages/core/src/access/catalogs.billing-invoice.test.ts`. They were not edited by this phase and remain outside its scope.
