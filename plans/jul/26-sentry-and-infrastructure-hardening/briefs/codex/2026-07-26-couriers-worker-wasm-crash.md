# Brief: fix the Couriers Worker `WebAssembly.compile()` crash in production

## The failure

Sentry issue **876-COURIERS-1** (`https://efesto.sentry.io/issues/7634540920/`),
project `876-couriers`, release `d6d04899fc8895f7dbba151eb6450352d2ea2c8c`,
environment `production`, 4 events, first seen 2026-07-26 19:31 UTC:

```
CompileError: WebAssembly.compile(): Wasm code generation disallowed by embedder
mechanism: auto.node.onunhandledrejection (unhandled)

at module evaluation (worker.js:48346:36)
at instantiateModule (worker.js:247207:11)
at getOrInstantiateModuleFromParent (worker.js:247220:16)
at Context.commonJsRequire [as r] (worker.js:246910:16)
at module evaluation (worker.js:48472:20)
… repeating commonJsRequire → module evaluation frames
```

Cloudflare Workers **forbid runtime WebAssembly compilation**. Only a `.wasm`
imported as a module (so the runtime receives a pre-compiled
`WebAssembly.Module` and can `new WebAssembly.Instance(...)` it) is allowed. A
call to `WebAssembly.compile(bytes)` throws exactly this `CompileError`. The
stack shows it happening during **module evaluation at import time**, inside the
Turbopack CommonJS module registry — not inside a request handler.

## What is already known (verified — do not re-derive)

- The crash is **Couriers-only**. The whole `efesto` org has three issues total:
  `876-BILLING-1` (a feature-flag error), `876-CONSOLE-3`, and this one. Console,
  Billing, Enterprise, and the consumer app do not throw it, even though Console
  and Billing are also Prisma-on-Workers apps.
- Couriers' Prisma client is generated for workerd:
  `apps/couriers/prisma/schema/schema.prisma:17-21` →
  `provider = "prisma-client"`, `runtime = "workerd"`.
- The generated client imports the wasm the correct way:
  `apps/couriers/src/lib/db/generated/prisma/internal/class.ts:49` →
  `await import('./query_compiler_fast_bg.wasm?module')`, with
  `import * as runtime from '@prisma/client/runtime/wasm-compiler-edge'`.
- The wasm binary is emitted as a real chunk in the build:
  `apps/couriers/.open-next/server-functions/default/apps/couriers/.next/server/chunks/`
  (and `chunks/ssr/`) `02dz_couriers_src_lib_db_generated_prisma_internal_query_compiler_fast_bg_0656eb_.wasm`.
  Console emits the analogous chunk.
- **`WebAssembly.compile` appears in the Turbopack runtime that ships in the
  server bundle:**
  `apps/couriers/.open-next/server-functions/default/apps/couriers/.next/server/chunks/ssr/[turbopack]_runtime.js`.
  This is the prime suspect — Turbopack's module loader compiling the wasm chunk
  from bytes instead of letting the Workers runtime hand over a compiled module.
- `apps/couriers/.open-next/worker.js` in this workspace is a stale 2.2 KB entry
  stub from an earlier build (06:23 UTC) and contains no `WebAssembly` reference.
  **Do not conclude from it that the deployed bundle is clean** — rebuild before
  drawing conclusions about bundle contents.
- Couriers depends on `@prisma/adapter-pg` **7.7.0** and `pg` **8.13.1** as
  runtime `dependencies` (`apps/couriers/package.json:39,45`), even though the
  Worker uses `@prisma/adapter-neon` (`apps/couriers/src/lib/db/index.ts:3,33`).
  The only `@prisma/adapter-pg` import in the app is
  `apps/couriers/prisma/seed.ts:3`, a script that is not part of the Worker.
  Console does **not** carry those two deps. This asymmetry is the other lead
  worth checking — if `pg` is being pulled into the server graph it drags in
  node-only code that Turbopack will wrap in the CJS registry.

## Your task

1. **Reproduce and localise.** Rebuild the Worker
   (`pnpm --filter @876/couriers cf:build`) and find the exact module whose
   evaluation calls `WebAssembly.compile`. Map `worker.js:48346` to its source
   module. State plainly which package/file it is — do not guess.
2. **Determine why Couriers hits it and Console does not.** Compare the two
   apps' `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, Prisma
   generator config, and server dependency graphs. Name the concrete difference.
3. **Fix it** with the smallest change that makes the Worker evaluate cleanly.
   Likely candidates, in order of preference — pick based on what step 1 actually
   shows, not on this ordering:
   - remove `@prisma/adapter-pg` / `pg` from `dependencies` (move to
     `devDependencies`, since only `prisma/seed.ts` uses them) if they are what
     drags the offending module in;
   - `serverExternalPackages` in `apps/couriers/next.config.ts` so the offending
     package is not bundled through the Turbopack CJS registry;
   - an `open-next.config.ts` / wrangler adjustment that lets the `.wasm` chunk
     be imported as a module instead of compiled from bytes.
4. **Verify**: `pnpm --filter @876/couriers cf:build` must succeed, and the built
   worker must contain **no** `WebAssembly.compile(` call reachable at module
   evaluation. Show the grep you used over `.open-next/` and its result. Also run
   `pnpm --filter @876/couriers typecheck` and `pnpm --filter @876/couriers test`.

## Constraints

- Do not disable Sentry, do not swallow the unhandled rejection, and do not
  "fix" this by filtering the event in `beforeSend`. The crash is real.
- Do not change the Prisma generator away from `runtime = "workerd"`.
- Do not touch any other app.
- Do **not** run `git add`, `git commit`, `git push`, or create branches.
- If after step 1 the root cause turns out to need a dependency upgrade or an
  upstream (Next/Turbopack/OpenNext/Prisma) fix that cannot be made here, **stop
  and report that** with the evidence rather than applying a speculative change.

## Report back

- The exact offending module and the call site, with file:line.
- The Couriers-vs-Console difference that explains it.
- The fix applied (or why none is safely available here).
- Full output of the verification commands.
