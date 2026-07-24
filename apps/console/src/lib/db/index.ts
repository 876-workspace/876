import 'server-only'

import { PrismaNeon } from '@prisma/adapter-neon'

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
  const adapter = new PrismaNeon({ connectionString })
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

let client: ConsolePrisma | undefined

function resolvePrisma(): ConsolePrisma {
  if (client) return client

  client = globalForPrisma.prisma ?? createPrisma()

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client

  return client
}

/**
 * Console's Prisma client. Only `@/lib/service` may query this; everything
 * else calls `service.<resource>.<verb>()`.
 *
 * The client is built on first property access, not at import. `next build`
 * imports every route module to collect page data, so eager construction made
 * the connection string a build-time requirement — and the Cloudflare build
 * environment has no `CONSOLE_DATABASE_URL`, only the Worker runtime does.
 */
export const prisma = new Proxy({} as ConsolePrisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = resolved[property as keyof ConsolePrisma]

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
