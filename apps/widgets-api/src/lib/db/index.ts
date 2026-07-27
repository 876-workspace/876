import 'server-only'

import { PrismaNeon } from '@prisma/adapter-neon'
import {
  createQueryGuard,
  createRequestScopedResolver,
  type QueryFailure,
} from '@876/core/db'
import * as Sentry from '@sentry/nextjs'

import { PrismaClient } from './generated/prisma/client'
import { collectionId, noteId } from '../id'

export type {
  NotepadCollection,
  NotepadNote,
  WidgetAuditEvent,
} from './generated/prisma/client'

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
        ? 'A Neon pool outlived the request that opened it. The query never settles, so Cloudflare cancels the invocation and the request fails with Error 1101.'
        : 'The request fails instead of resolving.',
    },
  })
}

function createPrisma() {
  const rawConnectionString = process.env.WIDGETS_DATABASE_URL
  if (!rawConnectionString)
    throw new Error('WIDGETS_DATABASE_URL is not set; Widgets DB unavailable.')

  const connectionString = rawConnectionString.replace(
    /([?&]sslmode=)(require|prefer|verify-ca)\b/,
    '$1verify-full'
  )
  const adapter = new PrismaNeon(
    { connectionString },
    {
      // Neon surfaces connection-level failures on the pool rather than
      // rejecting the in-flight query. Unhandled, that is exactly how a broken
      // connection becomes a Worker that hangs with nothing reported.
      onPoolError: (error) => reportDbFailure(error, { stage: 'pool' }),
    }
  )
  return new PrismaClient({ adapter })
    .$extends({
      query: {
        notepadNote: {
          async create({
            args,
            query,
          }: {
            args: Record<string, unknown>
            query: (args: unknown) => Promise<unknown>
          }) {
            const data = args.data as Record<string, unknown>
            if (!data.id) data.id = noteId()
            return query(args)
          },
        },
        notepadCollection: {
          async create({
            args,
            query,
          }: {
            args: Record<string, unknown>
            query: (args: unknown) => Promise<unknown>
          }) {
            const data = args.data as Record<string, unknown>
            if (!data.id) data.id = collectionId()
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

type WidgetsPrisma = ReturnType<typeof createPrisma>

const globalForPrisma = globalThis as unknown as {
  widgetsPrisma?: WidgetsPrisma
}

const resolvePrisma = createRequestScopedResolver<WidgetsPrisma>({
  create: createPrisma,
  adoptProcessClient: () => globalForPrisma.widgetsPrisma,
  storeProcessClient: (client) => {
    if (process.env.NODE_ENV !== 'production')
      globalForPrisma.widgetsPrisma = client
  },
  onMissingScope: () =>
    Sentry.captureMessage(
      'Widgets DB: no Cloudflare request scope on workerd',
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
 * The client is built on first property access, not at import. `next build`
 * imports every route module to collect page data, so eager construction made
 * the connection string a build-time requirement — and the Cloudflare build
 * environment has no `WIDGETS_DATABASE_URL`, only the Worker runtime does.
 *
 * On Cloudflare Workers the client is also scoped to the in-flight request:
 * the Neon pool's socket belongs to the request that opened it, and reusing it
 * from the next request on the same isolate hangs the Worker. See
 * `@876/core/db`.
 */
export const prisma = new Proxy({} as WidgetsPrisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = resolved[property as keyof WidgetsPrisma]

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
