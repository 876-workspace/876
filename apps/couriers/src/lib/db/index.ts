import 'server-only'

import { PrismaNeon } from '@prisma/adapter-neon'

import { PrismaClient } from './generated/prisma/client'
import { COURIERS_ID_PREFIXES, generateId, type EntityType } from '../id'

export type {
  Tenant,
  Domain,
  Contact,
  CourierCustomerProfile,
  CustomerAddress,
  Mailbox,
  Warehouse,
  Branch,
  TenantStatus,
  CustomerStatus,
  PackageStatus,
  Role,
  TeamMember,
  TeamMemberStatus,
} from './generated/prisma/client'

function assignGeneratedId(model: string, data: Record<string, unknown>): void {
  if (model in COURIERS_ID_PREFIXES && !data.id)
    data.id = generateId(model as EntityType)
}

function createPrisma() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set; Couriers DB unavailable.')
  }
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter }).$extends({
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
}

type CouriersPrisma = ReturnType<typeof createPrisma>
type TransactionCallback = Parameters<CouriersPrisma['$transaction']>[0]

export type PrismaTransactionClient = TransactionCallback extends (
  tx: infer TransactionClient
) => unknown
  ? TransactionClient
  : never

const globalForPrisma = globalThis as unknown as { prisma?: CouriersPrisma }

let client: CouriersPrisma | undefined

function resolvePrisma(): CouriersPrisma {
  if (client) return client

  client = globalForPrisma.prisma ?? createPrisma()

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client

  return client
}

/**
 * Couriers' Prisma client. Only `@/lib/service` may query this; everything
 * else calls `service.<resource>.<verb>()`.
 *
 * The client is built on first property access, not at import. `next build`
 * imports every route module to collect page data, so eager construction made
 * the connection string a build-time requirement — and the Cloudflare build
 * environment has no `DATABASE_URL`, only the Worker runtime does.
 */
export const prisma = new Proxy({} as CouriersPrisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = resolved[property as keyof CouriersPrisma]

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
