# Markdown renderer and editor

## Changed

- `packages/ui/src/components/markdown.tsx`: added synchronous `rehype-highlight`, extracted the readable typography constant, added table overflow wrapping, and retained `safeUrl` unchanged.
- `packages/ui/src/components/markdown-code-block.tsx`: added the isolated client-side code block with highlighted-language label, raw-text copy, copied state, and clipboard failure state.
- `packages/ui/src/876.css`: appended the variable-driven `hljs` token theme, including the platform dark-theme media and explicit-theme blocks.
- `packages/ui/src/components/markdown-editor.tsx`: made the formatting controls one horizontally scrollable row, increased controls to 36px, and explicitly retained `text-base` on the textarea. Preview already used shared `Markdown` and remains so.
- `packages/ui/src/components/markdown.test.tsx`, `markdown.advanced.test.tsx`, `markdown-code-block.test.tsx`, and `markdown-editor.contract.test.tsx`: covered highlighting, unrecognised and unlabeled fences, code-block UX, responsive table and type classes, task lists, URL safety, inline code, and editor mobile contracts. The existing highlighted-SQL assertion now checks the code element's complete text because highlighting intentionally splits it into token spans.
- `packages/ui/package.json` and `pnpm-lock.yaml`: added `rehype-highlight` at exact version `7.0.2`.

## Tests

Added 16 `it()` cases:

- 10 in `markdown.test.tsx`
- 4 in `markdown-code-block.test.tsx`
- 2 in `markdown-editor.contract.test.tsx`

Command output:

```text
$ pnpm --filter @876/ui typecheck
$ tsc --noEmit
```

```text
$ pnpm --filter @876/ui exec vitest run src/components/markdown.test.tsx src/components/markdown.advanced.test.tsx src/components/markdown-code-block.test.tsx src/components/markdown-editor.contract.test.tsx --no-file-parallelism

Test Files  4 passed (4)
Tests       45 passed (45)
```

```text
$ pnpm --filter @876/ui exec vitest run src/components/markdown-code-block.test.tsx --no-file-parallelism

Test Files  1 passed (1)
Tests       4 passed (4)
```

## Not verified

The requested package-wide commands `pnpm --filter @876/ui test` and `pnpm --filter @876/projects-ui test` both started Vitest but their runners became orphaned in this environment after emitting only `RUN v4.1.11`; I terminated only those exact runner process groups. The affected markdown/editor suites pass through the focused UI invocation above. No consumer-suite result is available.

## Left undone

Nothing intentionally left undone.
