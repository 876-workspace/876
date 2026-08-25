import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { PrismaClient } from './generated/prisma/client.js'

const connectionString = process.env.CRM_DATABASE_URL
if (!connectionString) throw new Error('CRM_DATABASE_URL is not configured.')

const pool = new Pool({ connectionString })
export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

export async function disconnectDb() {
  await prisma.$disconnect()
  await pool.end()
}
