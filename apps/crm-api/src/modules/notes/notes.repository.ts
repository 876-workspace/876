import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'

export function list(
  tenantId: string,
  requestId: string,
  access: { viewerId?: string; includePrivate?: boolean } = {}
) {
  return prisma.requestNote.findMany({
    where: {
      tenantId,
      requestId,
      deletedAt: null,
      ...(access.includePrivate
        ? {}
        : {
            OR: [
              { privateToUserId: null },
              ...(access.viewerId
                ? [{ privateToUserId: access.viewerId }]
                : []),
            ],
          }),
    },
    orderBy: { createdAt: 'desc' },
  })
}

export function retrieve(tenantId: string, requestId: string, id: string) {
  return prisma.requestNote.findFirst({
    where: { tenantId, requestId, id, deletedAt: null },
  })
}

export function create(params: {
  tenantId: string
  requestId: string
  body: string
  authorId: string
  visibility?: 'PUBLIC' | 'INTERNAL' | 'PRIVATE'
  internal?: boolean
}) {
  const visibility =
    params.visibility ?? (params.internal === false ? 'PUBLIC' : 'INTERNAL')

  return prisma.requestNote.create({
    data: {
      id: `note_${randomUUID().replaceAll('-', '')}`,
      tenantId: params.tenantId,
      requestId: params.requestId,
      body: params.body,
      authorId: params.authorId,
      internal: visibility !== 'PUBLIC',
      privateToUserId: visibility === 'PRIVATE' ? params.authorId : null,
      kind: 'NOTE',
    },
  })
}

export function update(id: string, params: { body: string }) {
  return prisma.requestNote.update({
    where: { id },
    data: { body: params.body, editedAt: new Date() },
  })
}

export async function remove(id: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.requestNote.delete({ where: { id } })
  else
    await prisma.requestNote.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    })

  return {
    object: 'request_note' as const,
    id,
    deleted: true as const,
  }
}
