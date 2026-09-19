# ResourceToolbar single render

## Changed files

- `packages/ui/src/components/resource-toolbar.tsx`: collapsed the phone and desktop trees into one responsive toolbar. The action cluster uses responsive ordering; one primary wrapper and one dropdown trigger remain in the DOM. The trigger keeps its phone ghost/circular styling and applies the former outline `icon-sm` appearance at `sm` and above.
- `packages/ui/src/components/resource-toolbar.test.tsx`: removed the duplicated-layout query helpers and rewrote the assertions for one tree. Counted `it()` cases: **15**.
- `packages/ui/src/876.css`: made `876-page-title-lg` use the standard `876-page-title` declarations from `40rem` upwards, including the nested filtered-title selector required by its existing specificity.

## Verification

Commands were run sequentially.

`pnpm --filter @876/ui typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/ui test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/packages/ui

Not implemented: navigation to another Document
Not implemented: navigation to another Document
```

The command's runner completed, but the execution harness yielded after 30 seconds and did not return Vitest's final summary. I therefore also ran the focused changed suite, which passed:

```text
Test Files  1 passed (1)
     Tests  15 passed (15)
Duration  2.97s
```

`pnpm --filter @876/projects-app exec vitest run 'src/app/(app)/board/page.test.tsx'`

```text
Test Files  1 passed (1)
     Tests  5 passed (5)
Duration  3.92s
```

## Remaining work

Nothing left undone. No commit was created. The only incomplete observation is the full UI suite's final summary, which the harness did not return; the focused toolbar suite and consumer board suite pass.
