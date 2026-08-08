import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import {
  createQueryGuard,
  createRequestScopedResolver,
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
  failure: Partial<QueryFailure> & { stage: 'pool' | 'query' }
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
        ? 'A pg pool outlived the request that opened it. The query never settles, so Cloudflare cancels the invocation and the page fails with Error 1101.'
        : 'The request fails instead of rendering.',
    },
  })
}

function createPrisma() {
  const rawConnectionString = process.env.CONSOLE_DATABASE_URL
  if (!rawConnectionString) {
    throw new Error('CONSOLE_DATABASE_URL is not set; Console DB unavailable.')
  }
  // Prisma Postgres is reached over its pooled TCP endpoint via `@prisma/adapter-pg`.
  // The client is request-scoped through `resolvePrisma` below, because a pg
  // socket belongs to the request that opened it and reusing it from the next
  // request on the same isolate hangs workerd.
  const connectionString = rawConnectionString
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
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
 * The client is also scoped to the in-flight request. That was mandatory under
 * the WebSocket driver, where a pool's socket belongs to the request that
 * opened it and reusing it from the next request on the same isolate hangs the
 * Worker. Over HTTP there is no socket to strand, so the scoping is now
 * belt-and-braces rather than load-bearing — kept because a throwaway HTTP
 * client per request costs nothing measurable, and because it keeps this app's
 * shape identical to the datastores still on the pool. See `@876/core/db`.
 */
export const prisma = new Proxy({} as ConsolePrisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = resolved[property as keyof ConsolePrisma]

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
