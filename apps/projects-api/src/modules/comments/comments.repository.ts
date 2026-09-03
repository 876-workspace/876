import { prisma } from '../../db/index.js'
import type { CommentRow } from './comments.serializers.js'

export type ListCommentsOptions = {
  limit: number
  startingAfter?: string
  endingBefore?: string
}

export async function list(
  issueId: string,
  options: ListCommentsOptions
): Promise<CommentRow[]> {
  const cursorId = options.startingAfter ?? options.endingBefore

  const rows = await prisma.comment.findMany({
    where: { issueId, deletedAt: null },
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
    take: options.endingBefore ? -(options.limit + 1) : options.limit + 1,
    orderBy: { createdAt: 'asc' },
  })

  return rows as CommentRow[]
}

export async function count(issueId: string): Promise<number> {
  return prisma.comment.count({
    where: { issueId, deletedAt: null },
  })
}

export async function retrieve(
  issueId: string,
  id: string
): Promise<CommentRow | null> {
  const row = await prisma.comment.findFirst({
    where: { issueId, id, deletedAt: null },
  })

  return row as CommentRow | null
}

export async function create(params: {
  id: string
  tenantId: string
  issueId: string
  authorUserId?: string | null
  body: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<CommentRow> {
  const row = await prisma.comment.create({
    data: params,
  })

  return row as CommentRow
}

export async function update(
  id: string,
  params: {
    body: string
    updatedAt: bigint
  }
): Promise<CommentRow> {
  const row = await prisma.comment.update({
    where: { id },
    data: params,
  })

  return row as CommentRow
}

export async function softDelete(
  id: string,
  deletedAt: bigint
): Promise<CommentRow> {
  const row = await prisma.comment.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt },
  })

  return row as CommentRow
}

export async function hardDelete(id: string): Promise<void> {
  await prisma.comment.delete({
    where: { id },
  })
}
