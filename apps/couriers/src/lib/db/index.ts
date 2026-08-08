import 'server-only'

import { withAccelerate } from '@prisma/extension-accelerate'
import {
  createQueryGuard,
  createRequestScopedResolver,
  requireAccelerateUrl,
  type QueryFailure,
} from '@876/core/db'
import * as Sentry from '@sentry/nextjs'

import { PrismaClient } from './generated/prisma/client'
import { COURIERS_ID_PREFIXES, generateId, type EntityType } from '../id'

export type {
  Tenant,
  Domain,
  Address,
  Contact,
  CourierCustomerProfile,
  CustomerAddress,
  CustomerAddressType,
  Mailbox,
  Warehouse,
  Branch,
  TenantStatus,
  CustomerStatus,
  PackageStatus,
  Role,
  TeamMember,
  TeamMemberStatus,
  OrganizationModule,
  ModulePreference,
} from './generated/prisma/client'

export type { Prisma } from './generated/prisma/client'

function assignGeneratedId(model: string, data: Record<string, unknown>): void {
  if (model in COURIERS_ID_PREFIXES && !data.id)
    data.id = generateId(model as EntityType)
}

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
  const accelerateUrl = requireAccelerateUrl(process.env.DATABASE_URL, {
    variable: 'DATABASE_URL',
    datastore: 'Couriers',
  })

  const client = new PrismaClient({ accelerateUrl })
    .$extends({
      query: {
        $allModels: {
          async create({
            model,
            args,
            query,
          }: {
            model: string
            args: Record<string, unknown>
            query: (args: unknown) => Promise<unknown>
          }) {
            const data = args.data as Record<string, unknown>
            assignGeneratedId(model, data)

            return query(args)
          },
          async upsert({
            model,
            args,
            query,
          }: {
            model: string
            args: Record<string, unknown>
            query: (args: unknown) => Promise<unknown>
          }) {
            const create = args.create as Record<string, unknown>
            assignGeneratedId(model, create)

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
  return client.$extends(withAccelerate()) as unknown as typeof client
}

type CouriersPrisma = ReturnType<typeof createPrisma>
type TransactionCallback = Parameters<CouriersPrisma['$transaction']>[0]

export type PrismaTransactionClient = TransactionCallback extends (
  tx: infer TransactionClient
) => unknown
  ? TransactionClient
  : never

const globalForPrisma = globalThis as unknown as { prisma?: CouriersPrisma }

const resolvePrisma = createRequestScopedResolver<CouriersPrisma>({
  create: createPrisma,
  adoptProcessClient: () => globalForPrisma.prisma,
  storeProcessClient: (client) => {
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
  },
  onMissingScope: () =>
    Sentry.captureMessage(
      'Couriers DB: no Cloudflare request scope on workerd',
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
 * Couriers' Prisma client. Only `@/lib/service` may query this; everything
 * else calls `service.<resource>.<verb>()`.
 *
 * The client is built on first property access, not at import. `next build`
 * imports every route module to collect page data, so eager construction made
 * the connection string a build-time requirement — and the Cloudflare build
 * environment has no `DATABASE_URL`, only the Worker runtime does.
 *
 * On Cloudflare Workers the client is scoped to the in-flight request, while
 * Accelerate owns the remote connection pool. See `@876/core/db`.
 */
export const prisma = new Proxy({} as CouriersPrisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = resolved[property as keyof CouriersPrisma]

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
