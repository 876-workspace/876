import { prisma } from '@/lib/db'
import { ok, type ServiceResult } from '../result'
import { serializeNote } from './serialize'
import type { NoteList } from './types'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function clampLimit(limit?: number) {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT)
}

export async function listNotes(params: {
  ownerAccountId: string
  limit?: number
  startingAfter?: string
  /** Filter to a single collection. */
  collectionId?: string
  /** When true, only notes with no collection (Unfiled). */
  unfiled?: boolean
}): Promise<ServiceResult<NoteList>> {
  const limit = clampLimit(params.limit)
  let updatedAtCursor: number | undefined

  if (params.startingAfter) {
    const cursor = await prisma.notepadNote.findUnique({
      where: { id: params.startingAfter },
    })
    if (cursor && cursor.ownerAccountId === params.ownerAccountId)
      updatedAtCursor = cursor.updatedAt
  }

  const collectionFilter = params.unfiled
    ? { collectionId: null }
    : params.collectionId
      ? { collectionId: params.collectionId }
      : {}

  const rows = await prisma.notepadNote.findMany({
    where: {
      ownerAccountId: params.ownerAccountId,
      ...collectionFilter,
      ...(updatedAtCursor !== undefined
        ? { updatedAt: { lt: updatedAtCursor } }
        : {}),
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return ok({
    object: 'list',
    data: page.map(serializeNote),
    has_more: hasMore,
    url: '/v1/notes',
    total_count: null,
  })
}

export async function listAllNotes(params: {
  ownerAccountId?: string
  limit?: number
  startingAfter?: string
}): Promise<ServiceResult<NoteList>> {
  const limit = clampLimit(params.limit)
  let updatedAtCursor: number | undefined

  if (params.startingAfter) {
    const cursor = await prisma.notepadNote.findUnique({
      where: { id: params.startingAfter },
    })
    if (cursor) updatedAtCursor = cursor.updatedAt
  }

  const rows = await prisma.notepadNote.findMany({
    where: {
      ...(params.ownerAccountId
        ? { ownerAccountId: params.ownerAccountId }
        : {}),
      ...(updatedAtCursor !== undefined
        ? { updatedAt: { lt: updatedAtCursor } }
        : {}),
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return ok({
    object: 'list',
    data: page.map(serializeNote),
    has_more: hasMore,
    url: '/v1/admin/notes',
    total_count: null,
  })
}
