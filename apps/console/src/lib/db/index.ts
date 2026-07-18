import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/prisma/client'
import { generateId } from '../id'

export type { Role, Member, Note, Setting } from './generated/prisma/client'

function createPrisma() {
  const rawConnectionString = process.env.CONSOLE_DATABASE_URL
  if (!rawConnectionString) {
    throw new Error('CONSOLE_DATABASE_URL is not set; Console DB unavailable.')
  }
  // pg-connection-string warns that sslmode=require/prefer/verify-ca are
  // deprecated aliases for verify-full; normalize so the alias never reaches
  // it regardless of what the configured env value supplies.
  const connectionString = rawConnectionString.replace(
    /([?&]sslmode=)(require|prefer|verify-ca)\b/,
    '$1verify-full'
  )
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter }).$extends({
    query: {
      note: {
        async create({
          args,
          query,
        }: {
          args: Record<string, unknown>
          query: (args: unknown) => Promise<unknown>
        }) {
          const data = args.data as Record<string, unknown>
          if (!data.id) {
            data.id = generateId('note')
          }
          return query(args)
        },
      },
    },
  })
}

type ConsolePrisma = ReturnType<typeof createPrisma>

const globalForPrisma = globalThis as unknown as { prisma?: ConsolePrisma }

/**
 * Console's Prisma client. Only `@/lib/service` may query this; everything
 * else calls `service.<resource>.<verb>()`.
 */
export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
