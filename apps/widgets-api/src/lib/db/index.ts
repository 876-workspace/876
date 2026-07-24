import 'server-only'

import { PrismaNeon } from '@prisma/adapter-neon'

import { PrismaClient } from './generated/prisma/client'
import { collectionId, noteId } from '../id'

export type {
  NotepadCollection,
  NotepadNote,
  WidgetAuditEvent,
} from './generated/prisma/client'

function createPrisma() {
  const rawConnectionString = process.env.WIDGETS_DATABASE_URL
  if (!rawConnectionString)
    throw new Error('WIDGETS_DATABASE_URL is not set; Widgets DB unavailable.')

  const connectionString = rawConnectionString.replace(
    /([?&]sslmode=)(require|prefer|verify-ca)\b/,
    '$1verify-full'
  )
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter }).$extends({
    query: {
      notepadNote: {
        async create({
          args,
          query,
        }: {
          args: Record<string, unknown>
          query: (args: unknown) => Promise<unknown>
        }) {
          const data = args.data as Record<string, unknown>
          if (!data.id) data.id = noteId()
          return query(args)
        },
      },
      notepadCollection: {
        async create({
          args,
          query,
        }: {
          args: Record<string, unknown>
          query: (args: unknown) => Promise<unknown>
        }) {
          const data = args.data as Record<string, unknown>
          if (!data.id) data.id = collectionId()
          return query(args)
        },
      },
    },
  })
}

type WidgetsPrisma = ReturnType<typeof createPrisma>

const globalForPrisma = globalThis as unknown as {
  widgetsPrisma?: WidgetsPrisma
}

let client: WidgetsPrisma | undefined

function resolvePrisma(): WidgetsPrisma {
  if (client) return client

  client = globalForPrisma.widgetsPrisma ?? createPrisma()

  if (process.env.NODE_ENV !== 'production')
    globalForPrisma.widgetsPrisma = client

  return client
}

/**
 * The client is built on first property access, not at import. `next build`
 * imports every route module to collect page data, so eager construction made
 * the connection string a build-time requirement — and the Cloudflare build
 * environment has no `WIDGETS_DATABASE_URL`, only the Worker runtime does.
 */
export const prisma = new Proxy({} as WidgetsPrisma, {
  get(_target, property) {
    const resolved = resolvePrisma()
    const value = resolved[property as keyof WidgetsPrisma]

    return typeof value === 'function' ? value.bind(resolved) : value
  },
})
