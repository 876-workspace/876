import 'server-only'

import { PrismaNeon } from '@prisma/adapter-neon'
import { withAccelerate } from '@prisma/extension-accelerate'
import {
  createQueryGuard,
  createRequestScopedResolver,
  isAccelerateUrl,
  requireDatabaseUrl,
  type QueryFailure,
} from '@876/core/db'
import * as Sentry from '@sentry/nextjs'

import { PrismaClient } from './generated/prisma/client'
import { generateId } from '../id'

export type { Role, Member, Note, Setting } from './generated/prisma/client'

/**
 * Reports a database failure with the consequence spelled out, so a hung or
 * refused query is attributable in Sentry instead of arriving as a bare
 * Cloudflare 1101 with no application error attached.
 */
function reportDbFailure(
  error: unknown,
  failure: Partial<QueryFailure> & { stage: 'query' }
): void {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      category: 'db',
      db_stage: failure.stage,
      db_failure: failure.crossRequestIo
        ? 'cross_request_io'
        : failure.timedOut
          ? 'timeout'
          : 'error',
    },
    extra: {
      model: failure.model ?? null,
      operation: failure.operation ?? null,
      consequence: failure.crossRequestIo
        ? 'A database request crossed its Worker request scope. The query never settles, so Cloudflare cancels the invocation and the page fails with Error 1101.'
        : 'The request fails instead of rendering.',
    },
  })
}

function createPrisma() {
  const databaseUrl = requireDatabaseUrl(process.env.CONSOLE_DATABASE_URL, {
    variable: 'CONSOLE_DATABASE_URL',
    datastore: 'Console',
  })
  const accelerated = isAccelerateUrl(databaseUrl)

  // Neon is reached over its serverless WebSocket driver: workerd cannot open
  // the raw TCP socket `pg` needs, and the adapter owns the remote pool the
  // way Accelerate used to.
  const client = accelerated
    ? new PrismaClient({ accelerateUrl: databaseUrl })
    : new PrismaClient({
        adapter: new PrismaNeon({ connectionString: databaseUrl }),
      } as unknown as { accelerateUrl: string })
        .$extends({
          query: {
            note: {
              async create({
                args,
                query,
              }: {
                args: Record<string, unknown>
                query: (args: unknown) => Promise<unknown>
              }) {
                const data = args.data as Record<string, unknown>
                if (!data.id) {
                  data.id = generateId('note')
                }
                return query(args)
              },
            },
          },
        })
        .$extends({
          query: {
            $allOperations: createQueryGuard({
              onFailure: (error, failure) =>
                reportDbFailure(error, { ...failure, stage: 'query' }),
            }),
          },
        })

  // Keep the existing service-facing extension type stable. Accelerate is
  // applied at runtime for pooling; cacheStrategy is intentionally deferred.
  // Accelerate's extension only applies when the URL is actually an
  // Accelerate URL; the driver adapter needs no extension.
  if (!accelerated) return client

  // `$extends` computes a deeply nested result type that this function throws
  // away anyway. Letting tsc resolve it pushes the program past its
  // instantiation-depth limit (TS2589), so call it through a narrowed
  // signature: the extension is still applied at runtime, on `client`, and the
  // service-facing type stays exactly what it was.
  return (
    client as unknown as {
      $extends: (extension: unknown) => typeof client
    }
  ).$extends(withAccelerate())
}

type ConsolePrisma = ReturnType<typeof createPrisma>

const globalForPrisma = globalThis as unknown as { prisma?: ConsolePrisma }

const resolvePrisma = createRequestScopedResolver<ConsolePrisma>({
  create: createPrisma,
  adoptProcessClient: () => globalForPrisma.prisma,
  storeProcessClient: (client) => {
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
  },
  onMissingScope: () =>
    Sentry.captureMessage(
      'Console DB: no Cloudflare request scope on workerd',
      {
        level: 'error',
        tags: { category: 'db', db_failure: 'missing_request_scope' },
        extra: {
          consequence:
            "OpenNext's request-context symbol did not resolve, so per-request client scoping is off. Queries fall back to a throwaway client per access.",
        },
      }
    ),
})

/**
 * Console's Prisma client. Only `@/lib/service` may query this; everything
 * else calls `service.<resource>.<verb>()`.
 *
 * The client is built on first property access, not at import. `next build`
 * imports every route module to collect page data, so eager construction made
 * the connection string a build-time requirement — and the Cloudflare build
 * environment has no `CONSOLE_DATABASE_URL`, only the Worker runtime does.
 *
 * The client is scoped to the in-flight request so its lifecycle remains
 * aligned with the Worker request context. Accelerate owns the remote
 * connection pool, so no local socket is reused across requests. See
 * `@876/core/db`.
 */
export const prisma = new Proxy({} as ConsolePrisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = resolved[property as keyof ConsolePrisma]

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
