# Large-title app bar — command/code report

## Files changed

- `packages/ui/src/components/resource-toolbar.tsx`
  - Added the opt-in `mobilePrimary: 'button' | 'fab-owns-it'` prop, defaulting
    to `'button'`.
  - Added Tailwind-selected phone and desktop layouts. The phone layout uses a
    large title, ghost circular overflow trigger, and suppresses the primary
    button only when the FAB owns that action. The desktop layout retains the
    existing toolbar markup and outline overflow trigger.
- `packages/ui/src/components/resource-toolbar.test.tsx`
  - Added 10 `it()` cases covering both responsive branches, title semantics,
    primary-action ownership, trigger variants, descriptions, refresh transfer
    actions, and absent primary labels.
- `packages/ui/src/876.css`
  - Added the shared `876-page-title-lg` large-title recipe.

## Verification

`pnpm --filter @876/ui typecheck`

```text
$ tsc --noEmit
```

Exit code: 0.

`pnpm --filter @876/ui test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/packages/ui

Not implemented: navigation to another Document
Not implemented: navigation to another Document

 Test Files  42 passed (42)
      Tests  367 passed (367)
   Start at  16:28:32
   Duration  105.23s (transform 5.21s, setup 23.34s, import 59.74s, tests 75.56s, environment 128.87s)
```

Exit code: 0. The two navigation notices were emitted by the test environment;
they did not fail the suite.

## Not verified / undone

- No browser viewport screenshot or manual visual QA was run; the responsive
  branches and class contracts are covered by component tests.
- No app caller was changed to opt into `mobilePrimary="fab-owns-it"`, per the
  requested component-only scope.
