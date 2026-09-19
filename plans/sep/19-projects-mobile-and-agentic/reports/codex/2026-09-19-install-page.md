# Install page

## Files changed

- `apps/projects/src/app/(app)/install/page.tsx` — added the authenticated Install screen and local `Install` tab metadata.
- `apps/projects/src/app/(app)/install/_components/install-guide.tsx` — added server-rendered platform instructions and client-only standalone/prompt detection.
- `apps/projects/src/app/(app)/install/page.test.tsx` — covers the server-rendered page content and metadata.
- `apps/projects/src/app/(app)/install/_components/install-guide.test.tsx` — covers standalone, iOS standalone, manual, and install-prompt states.
- `apps/projects/src/components/shell/user-menu.tsx` — adds the `/install` account-menu entry.
- `apps/projects/src/components/shell/user-menu.test.tsx` — verifies the account-menu link.
- `packages/ui/src/components/sidebar-user-menu.tsx` — accepts static app-specific account-menu items so Projects can add the link using the existing menu styling.

## Tests added

11 `it()` cases.

## Verification

`pnpm --filter @876/projects-app typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/projects-app exec vitest run src/app/\(app\)/install src/components/shell/user-menu.test.tsx`

```text
RUN  v4.1.11 /root/projects/876/apps/projects

Test Files  3 passed (3)
     Tests  11 passed (11)
Start at  16:33:14
Duration  4.71s (transform 514ms, setup 1.13s, import 1.75s, tests 2.38s, environment 5.98s)
```

## Not verified

No browser/device install flow was run; browser install eligibility and the native prompt depend on the deployed manifest, service worker, and browser policy.

## Left undone

Nothing.
