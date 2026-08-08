import { PrismaPg } from '@prisma/adapter-pg'

import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

import { PrismaClient } from './generated/prisma/client'

const log = getLogger('db')

/**
 * The Prisma client singleton.
 *
 * This service runs as a long-lived Node process in a Cloudflare Container, not
 * in a serverless function, so a real connection pool is correct here — the
 * FastAPI service used SQLAlchemy's NullPool specifically because a pooled
 * asyncpg connection could outlive the event loop that created it between
 * freezes. That constraint does not apply to a container.
 *
 * Only a `*.repository.ts` may import this module; dependency-cruiser enforces
 * it (.claude/rules/express-api.md).
 */
function createClient(): PrismaClient {
  const { databaseUrl, environment } = getSettings()
  if (!databaseUrl) throw new Error('DATABASE_URL is not set.')

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    // Retire idle pooled connections proactively rather than discovering a
    // server-closed socket in the middle of a later query.
    idleTimeoutMillis: 30_000,
    max: 10,
  })

  return new PrismaClient({
    adapter,
    log: environment === 'development' ? ['warn', 'error'] : ['error'],
  })
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
