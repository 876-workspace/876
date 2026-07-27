/**
 * `@876/core/db` — request-scoped database clients for Cloudflare Workers.
 *
 * Every 876 app with its own datastore (Console, Couriers, Billing,
 * Widgets API) builds a Prisma client over `@prisma/adapter-neon`, which opens
 * a Neon **WebSocket pool**. A socket on workerd belongs to the request that
 * opened it: reusing one from a later request on the same isolate throws
 * `Cannot perform I/O on behalf of a different request`, and because the
 * adapter reports that on the pool rather than rejecting the in-flight query,
 * the query promise never settles. The runtime then sees a Worker that can
 * make no further progress and cancels the invocation — surfacing as
 * Cloudflare Error 1101 with no application error anywhere.
 *
 * The fix is to scope the client to the request instead of the isolate. This
 * module owns that resolution plus the observability that turns a silent hang
 * into a reported failure, so the four app datastores share one implementation
 * rather than four subtly different copies.
 *
 * This module is intentionally a single file with no relative imports and no
 * dependencies — it is consumed as raw source through the package `exports`
 * map, exactly like `@876/core/client`.
 *
 * @module @876/core/db
 */

// ── Runtime detection ───────────────────────────────────────────────────────

/**
 * OpenNext publishes the current Cloudflare context behind this symbol. The
 * property is a getter over an `AsyncLocalStorage` store, so the value is
 * always the *in-flight* request's context even when invocations interleave at
 * an await point.
 *
 * We read the symbol rather than calling `getCloudflareContext()` because that
 * helper throws when no context exists, and the `prisma` proxy resolves a
 * client on every property access — in Node (`next dev`, vitest, build-time
 * page-data collection) that would allocate an `Error` per access.
 */
const cloudflareContextSymbol = Symbol.for('__cloudflare-context__')

/**
 * The current request's Cloudflare `ExecutionContext`, or `undefined` when no
 * request is in flight (Node, tests, static generation).
 *
 * @returns The per-request context object, usable as a `WeakMap` key.
 */
export function getRequestScope(): object | undefined {
  const context = (globalThis as unknown as Record<symbol, unknown>)[
    cloudflareContextSymbol
  ] as { ctx?: object } | undefined

  return context?.ctx
}

/**
 * Whether this code is executing on the Cloudflare Workers runtime.
 *
 * @returns `true` on workerd, `false` under Node.
 */
export function isWorkerdRuntime(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.userAgent === 'Cloudflare-Workers'
  )
}

// ── Error identification ────────────────────────────────────────────────────

/** The workerd message emitted when an I/O object outlives its request. */
export const CROSS_REQUEST_IO_MESSAGE =
  'Cannot perform I/O on behalf of a different request'

/**
 * Whether an error is workerd rejecting reuse of another request's I/O object.
 *
 * @param error - The thrown value to inspect.
 * @returns `true` when the error is the cross-request I/O failure.
 */
export function isCrossRequestIoError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes(CROSS_REQUEST_IO_MESSAGE)
  )
}

/**
 * A database connection opened by an earlier request was reused by this one.
 *
 * Raised in place of the raw workerd error so the message names the cause and
 * the fix instead of describing the runtime constraint in the abstract.
 */
export class DatabaseConnectionReusedError extends Error {
  override readonly name = 'DatabaseConnectionReusedError'

  constructor(
    /** The operation that hit the reused connection, e.g. `tenant.findFirst`. */
    readonly operation: string,
    override readonly cause?: unknown
  ) {
    super(
      `Database connection reuse across requests (${operation}). The connection ` +
        `pool was opened by an earlier request on this isolate; Cloudflare ` +
        `Workers forbids reusing its socket, so the query can never complete. ` +
        `The client must be created per request — see @876/core/db.`
    )
  }
}

/**
 * A database query ran past the guard timeout and was failed deliberately.
 *
 * Without this the invocation stalls until the runtime cancels it, which
 * produces a Cloudflare 1101 and no application-level error to report.
 */
export class DatabaseQueryTimeoutError extends Error {
  override readonly name = 'DatabaseQueryTimeoutError'

  constructor(
    /** The operation that timed out, e.g. `tenant.findFirst`. */
    readonly operation: string,
    /** The elapsed budget, in milliseconds. */
    readonly timeoutMs: number,
    override readonly cause?: unknown
  ) {
    super(
      `Database query timed out after ${timeoutMs}ms (${operation}). The ` +
        `request was failed deliberately so the Worker returns an error ` +
        `instead of hanging until the runtime cancels it.`
    )
  }
}

// ── Request-scoped resolution ───────────────────────────────────────────────

/** Options for {@link createRequestScopedResolver}. */
export type RequestScopedResolverOptions<T extends object> = {
  /** Builds a new client. Called once per request on workerd. */
  create: () => T
  /**
   * An existing process-wide client to adopt off Node's HMR global, if any.
   * Never consulted on workerd.
   */
  adoptProcessClient?: () => T | undefined
  /** Stores the process-wide client on Node's HMR global. */
  storeProcessClient?: (client: T) => void
  /**
   * Called once per isolate when running on workerd with no request scope —
   * the signal that OpenNext's context symbol moved and per-request scoping
   * has silently stopped working.
   */
  onMissingScope?: () => void
}

/**
 * Builds a resolver that returns one client per in-flight request on workerd,
 * and one client per process everywhere else.
 *
 * On workerd the client is held in a `WeakMap` keyed by the request's
 * `ExecutionContext`, so it is collected with the request and never leaks into
 * the next one. Under Node a single long-lived client is both correct and
 * cheaper, and the HMR global keeps `next dev` from exhausting connections.
 *
 * @param options - How to create, adopt, and store the client.
 * @returns A resolver safe to call on every property access.
 *
 * @example
 * const resolvePrisma = createRequestScopedResolver({ create: createPrisma })
 * export const prisma = new Proxy({} as Client, {
 *   get: (_t, property) => Reflect.get(resolvePrisma(), property),
 * })
 */
export function createRequestScopedResolver<T extends object>(
  options: RequestScopedResolverOptions<T>
): () => T {
  const { create, adoptProcessClient, storeProcessClient, onMissingScope } =
    options

  const clientsByRequest = new WeakMap<object, T>()
  let processClient: T | undefined
  let reportedMissingScope = false

  return function resolveClient(): T {
    const scope = getRequestScope()

    if (scope) {
      const existing = clientsByRequest.get(scope)
      if (existing) return existing

      const created = create()
      clientsByRequest.set(scope, created)

      return created
    }

    if (isWorkerdRuntime()) {
      // Caching here is precisely the bug this module exists to prevent, so
      // build a throwaway client and make the missing scope loud instead.
      if (!reportedMissingScope) {
        reportedMissingScope = true
        onMissingScope?.()
      }

      return create()
    }

    processClient ??= adoptProcessClient?.() ?? create()
    storeProcessClient?.(processClient)

    return processClient
  }
}

// ── Query guard ─────────────────────────────────────────────────────────────

/** How long a single query may run before the guard fails it. */
export const DEFAULT_QUERY_TIMEOUT_MS = 10_000

/** What the guard observed about a failed query. */
export type QueryFailure = {
  /** The operation that failed, e.g. `tenant.findFirst`. */
  operation: string
  /** The Prisma model, absent for raw and top-level operations. */
  model?: string
  /** Whether the failure was workerd rejecting cross-request I/O. */
  crossRequestIo: boolean
  /** Whether the guard's own timeout fired. */
  timedOut: boolean
}

/** Options for {@link createQueryGuard}. */
export type QueryGuardOptions = {
  /** Per-query budget in milliseconds. Defaults to {@link DEFAULT_QUERY_TIMEOUT_MS}. */
  timeoutMs?: number
  /** Reports a failed query, typically to Sentry. Must not throw. */
  onFailure?: (error: unknown, failure: QueryFailure) => void
}

/** The `$allOperations` payload a Prisma query extension receives. */
export type QueryGuardArgs<TArgs, TResult> = {
  model?: string
  operation: string
  args: TArgs
  query: (args: TArgs) => Promise<TResult>
}

/**
 * Builds a Prisma `$allOperations` handler that bounds every query and reports
 * failures.
 *
 * The timeout is what makes a stalled connection observable: a pending timer
 * counts as outstanding work, so the runtime keeps the invocation alive long
 * enough for the rejection to reach an error boundary and a reporter, rather
 * than cancelling it as a hang with nothing recorded.
 *
 * @param options - Timeout budget and failure reporter.
 * @returns A handler to pass as `query.$allOperations` to `$extends`.
 */
export function createQueryGuard(options: QueryGuardOptions = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_QUERY_TIMEOUT_MS
  const { onFailure } = options

  return async function guardQuery<TArgs, TResult>({
    model,
    operation,
    args,
    query,
  }: QueryGuardArgs<TArgs, TResult>): Promise<TResult> {
    const label = model ? `${model}.${operation}` : operation

    let timer: ReturnType<typeof setTimeout> | undefined
    let timedOut = false

    try {
      return await Promise.race([
        query(args),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            timedOut = true
            reject(new DatabaseQueryTimeoutError(label, timeoutMs))
          }, timeoutMs)
        }),
      ])
    } catch (error) {
      const crossRequestIo = isCrossRequestIoError(error)

      onFailure?.(error, { operation, model, crossRequestIo, timedOut })

      if (crossRequestIo) throw new DatabaseConnectionReusedError(label, error)

      throw error
    } finally {
      clearTimeout(timer)
    }
  }
}
