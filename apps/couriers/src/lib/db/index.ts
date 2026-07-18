import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'

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
} from './generated/prisma/client'

function createPrisma() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set; Couriers DB unavailable.')
  }
  const adapter = new PrismaPg({ connectionString })
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
          if (model in COURIERS_ID_PREFIXES && !data.id) {
            data.id = generateId(model as EntityType)
          }
          return query(args)
        },
      },
    },
  })
}

type CouriersPrisma = ReturnType<typeof createPrisma>

const globalForPrisma = globalThis as unknown as { prisma?: CouriersPrisma }

/**
 * Couriers' Prisma client. Only `@/lib/service` may query this; everything
 * else calls `service.<resource>.<verb>()`.
 */
export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
