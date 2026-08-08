import { withAccelerate } from '@prisma/extension-accelerate'

import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

import { PrismaClient } from './generated/prisma/client'

const log = getLogger('db')

/**
 * The Prisma client singleton.
 *
 * This service runs as a long-lived Node process in a Cloudflare Container.
 * Prisma Accelerate owns the remote connection pool so container instances do
 * not maintain their own database socket pool.
 *
 * Only a `*.repository.ts` may import this module; dependency-cruiser enforces
 * it (.claude/rules/express-api.md).
 */
function createClient() {
  const { databaseUrl, environment } = getSettings()
  if (!databaseUrl) throw new Error('DATABASE_URL is not set.')

  const client = new PrismaClient({
    accelerateUrl: databaseUrl,
    log: environment === 'development' ? ['warn', 'error'] : ['error'],
  })

  // This rollout intentionally does not expose cacheStrategy. Keep the
  // repository-facing client type stable while routing every query through the
  // Accelerate extension at runtime.
  return client.$extends(withAccelerate()) as unknown as PrismaClient
}

export const prisma: PrismaClient = createClient()

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect()
}

/**
 * Liveness probe for the readiness endpoint. Returns false rather than throwing
 * so a health check never becomes a 500.
 */
export async function pingDb(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    log.error({ err: error }, 'db.ping.failed')
    return false
  }
}
