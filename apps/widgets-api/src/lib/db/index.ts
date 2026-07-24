import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'

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
  const adapter = new PrismaPg({ connectionString })
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

const globalForPrisma = globalThis as unknown as {
  widgetsPrisma?: ReturnType<typeof createPrisma>
}

export const prisma = globalForPrisma.widgetsPrisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production')
  globalForPrisma.widgetsPrisma = prisma
