import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { PrismaClient } from './generated/prisma/client'

function createPrisma() {
  const connectionString = process.env.CRM_DATABASE_URL
  if (!connectionString) throw new Error('CRM_DATABASE_URL is not configured.')

  const pool = new Pool({ connectionString })
  return new PrismaClient({ adapter: new PrismaPg(pool) })
}

type CrmPrisma = ReturnType<typeof createPrisma>
const globalForPrisma = globalThis as unknown as { crmPrisma?: CrmPrisma }

export const prisma = globalForPrisma.crmPrisma ?? createPrisma()
if (process.env.NODE_ENV !== 'production') globalForPrisma.crmPrisma = prisma

export type { CustomerProfile, CustomerProfileStatus } from './generated/prisma/client'
