/**
 * Shared client-runtime primitives for 876 client packages.
 *
 * Every tier package (`@876/sdk`, `@876/admin`, future `@876/<product>`
 * clients) resolves its API base URL and reads the environment the same way;
 * only the env-var precedence and credential headers differ per tier. This
 * module owns those primitives so tier packages stay thin composition layers.
 *
 * @module @876/core/client
 */

/**
 * Reads `process.env` defensively. Client packages are bundled into browser
 * and server builds; Next.js inlines `NODE_ENV` and `NEXT_PUBLIC_*` at build
 * time, and browser bundles may have no `process` global at all.
 */
export function readClientEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env ?? {}
  )
}

/**
 * Resolves a client base URL from an explicit option or ordered env keys.
 *
 * An explicit `baseUrl` always wins. Otherwise the first defined env var in
 * `envKeys` is used. Returns `undefined` when nothing matches so each tier
 * package decides its own fallback (dev localhost, request-time error, …).
 *
 * @param baseUrl - Explicit base URL passed to the client factory.
 * @param envKeys - Env var names to try, in tier-specific precedence order.
 * @returns The resolved base URL, or `undefined` when unconfigured.
 */
export function resolveClientBaseUrl(
  baseUrl: string | undefined,
  envKeys: readonly string[]
): string | undefined {
  if (baseUrl) return baseUrl

  const env = readClientEnv()
  for (const key of envKeys) {
    const value = env[key]
    if (value) return value
  }

  return undefined
}

/** Returns whether the current build runs in production mode. */
export function isProductionEnv(): boolean {
  return readClientEnv().NODE_ENV === 'production'
}

/**
 * A resource factory: binds a tier runtime to a `<resource>.<verb>` method
 * group. Tier and product clients are composed from these — the client
 * factory creates one runtime and passes it to each resource factory it
 * includes, so a package's surface is exactly the set of factories it
 * composes (admin-only operations never exist in consumer packages).
 */
export type ResourceFactory<TRuntime, TResource> = (
  runtime: TRuntime
) => TResource
