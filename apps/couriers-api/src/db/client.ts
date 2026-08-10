import { withAccelerate } from '@prisma/extension-accelerate'

import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

import { PrismaClient } from './generated/prisma/client'

const log = getLogger('db')

function createClient() {
  const { databaseUrl, environment } = getSettings()
  if (!databaseUrl) throw new Error('DATABASE_URL is not set.')

  const client = new PrismaClient({
    accelerateUrl: databaseUrl,
    log: environment === 'development' ? ['warn', 'error'] : ['error'],
  } as never)

  return client.$extends(withAccelerate()) as unknown as PrismaClient
}

export const prisma: PrismaClient = createClient()

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect()
}

export async function pingDb(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    log.error({ err: error }, 'db.ping.failed')
    return false
  }
}
