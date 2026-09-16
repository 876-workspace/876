import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { getSettings } from '../config/index.js'
import { PrismaClient } from './generated/prisma/client.js'

const connectionString = getSettings().databaseUrl

const pool = new Pool({ connectionString })
export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

export async function disconnectDb() {
  await prisma.$disconnect()
  await pool.end()
}
