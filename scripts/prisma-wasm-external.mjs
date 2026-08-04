import { resolve } from 'node:path'

/**
 * Keeps Prisma's query-compiler WASM out of the JS bundle so Cloudflare can
 * load it as a real Worker WebAssembly module.
 *
 * The `workerd` Prisma client imports the compiler as
 * `import('./query_compiler_fast_bg.wasm?module')`. Both Next bundlers get this
 * wrong for Workers:
 *
 * - **Turbopack** (the Next 16 default) emits a Node loader that reads the
 *   `.wasm` off disk with `fs.createReadStream` and compiles it with
 *   `WebAssembly.compileStreaming`. workerd has no filesystem and does not
 *   implement `compileStreaming`, so the first query in the request throws
 *   `WebAssembly.compileStreaming is not a function` and the route 500s.
 *   `@opennextjs/cloudflare` patches Turbopack's `loadWebAssemblyModule`, but
 *   not the separate helper Turbopack emits for a direct `.wasm?module` import,
 *   so the adapter does not cover this path.
 * - **webpack** refuses the import outright ("module is not flagged as
 *   WebAssembly module") because `asyncWebAssembly` is off by default.
 *
 * Marking the request external leaves the `import()` in the output untouched.
 * `@opennextjs/cloudflare`'s `wrangler-externals` esbuild plugin then keeps it
 * external through the server bundle, and wrangler bundles the `.wasm` as a
 * Worker module — the form workerd can actually instantiate.
 *
 * The path is resolved to an absolute one here because the emitted chunk lives
 * in `.next/server/`, several directories away from the generated client, so a
 * relative specifier would no longer resolve once it reaches wrangler.
 *
 * Requires the build to run with `--webpack`; Turbopack has no externals hook.
 */
export function externalizePrismaWasm(config) {
  config.externals = [
    ...(Array.isArray(config.externals)
      ? config.externals
      : config.externals
        ? [config.externals]
        : []),
    ({ context, request }, callback) => {
      if (request?.endsWith('.wasm?module') && request.startsWith('.'))
        return callback(null, `module ${resolve(context, request)}`)

      return callback()
    },
  ]

  return config
}
