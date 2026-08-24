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
        ? 'A database request crossed its Worker request scope. The query never settles, so Cloudflare cancels the invocation and the request fails with Error 1101.'
        : 'The request fails instead of resolving.',
    },
  })
}

function createPrisma(): PrismaClient {
  const databaseUrl = requireDatabaseUrl(process.env.WIDGETS_DATABASE_URL, {
    variable: 'WIDGETS_DATABASE_URL',
    datastore: 'Widgets',
  })
  const accelerated = isAccelerateUrl(databaseUrl)

  // Neon is reached over its serverless WebSocket driver: workerd cannot open
  // the raw TCP socket `pg` needs, and the adapter owns the remote pool the
  // way Accelerate used to.
  // Keep the existing service-facing extension type stable. Accelerate is
  // applied at runtime for pooling; cacheStrategy is intentionally deferred.
  // Accelerate's extension only applies when the URL is actually an
  // Accelerate URL; the driver adapter needs no extension.
  if (accelerated)
    return new PrismaClient({ accelerateUrl: databaseUrl }).$extends(
      withAccelerate()
    ) as unknown as PrismaClient

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: databaseUrl }),
  } as unknown as { accelerateUrl: string })
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
    }) as unknown as PrismaClient
}

type WidgetsPrisma = PrismaClient

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
 * On Cloudflare Workers the client is scoped to the in-flight request, while
 * Accelerate owns the remote connection pool. See `@876/core/db`.
 */
export const prisma = new Proxy({} as WidgetsPrisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = Reflect.get(resolved, property)

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
