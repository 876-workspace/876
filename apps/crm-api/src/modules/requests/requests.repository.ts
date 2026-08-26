import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type {
  RequestCategory,
  RequestPriority,
  RequestSource,
  RequestStatus,
} from '../../types/request.js'

export function list(tenantId: string) {
  return prisma.request.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export function retrieve(tenantId: string, id: string) {
  return prisma.request.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export function customerExists(tenantId: string, customerId: string) {
  return prisma.customerProfile.findFirst({
    where: { tenantId, id: customerId, deletedAt: null },
    select: { id: true },
  })
}

export function create(params: {
  tenantId: string
  customerId: string
  subject: string
  description?: string | null
  category?: RequestCategory
  priority?: RequestPriority
  source?: RequestSource
  assigneeId?: string | null
  createdBy: string
}) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.update({
      where: { id: params.tenantId },
      data: { nextRequestNumber: { increment: 1 } },
      select: { nextRequestNumber: true },
    })

    const request = await tx.request.create({
      data: {
        id: `crm_req_${randomUUID().replaceAll('-', '')}`,
        tenantId: params.tenantId,
        customerId: params.customerId,
        number: tenant.nextRequestNumber - 1,
        subject: params.subject,
        category: params.category ?? 'GENERAL',
        priority: params.priority ?? 'NORMAL',
        source: params.source ?? 'CRM',
        assigneeId: params.assigneeId ?? null,
        createdBy: params.createdBy,
      },
    })

    const description = params.description?.trim()
    if (description) {
      await tx.requestNote.create({
        data: {
          id: `crm_note_${randomUUID().replaceAll('-', '')}`,
          tenantId: params.tenantId,
          requestId: request.id,
          body: description,
          authorId: params.createdBy,
          internal: false,
          kind: 'DESCRIPTION',
        },
      })
    }

    return request
  })
}

export function update(
  id: string,
  params: {
    subject?: string
    category?: RequestCategory
    status?: RequestStatus
    priority?: RequestPriority
    source?: RequestSource
    assigneeId?: string | null
    resolvedAt?: Date | null
    closedAt?: Date | null
  }
) {
  return prisma.request.update({ where: { id }, data: params })
}

export async function remove(params: {
  id: string
  deletedBy: string
  reason?: string | null
}) {
  if (process.env.DELETION_MODE === 'hard') {
    await prisma.request.delete({ where: { id: params.id } })
  } else {
    await prisma.request.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: params.deletedBy,
        deletionReason: params.reason?.trim() || null,
      },
    })
  }

  return { object: 'request' as const, id: params.id, deleted: true as const }
}

export function listNotes(tenantId: string, requestId: string) {
  return prisma.requestNote.findMany({
    where: { tenantId, requestId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export function retrieveNote(
  tenantId: string,
  requestId: string,
  id: string
) {
  return prisma.requestNote.findFirst({
    where: { tenantId, requestId, id, deletedAt: null },
  })
}

export function createNote(params: {
  tenantId: string
  requestId: string
  body: string
  authorId: string
  internal?: boolean
}) {
  return prisma.requestNote.create({
    data: {
      id: `crm_note_${randomUUID().replaceAll('-', '')}`,
      tenantId: params.tenantId,
      requestId: params.requestId,
      body: params.body,
      authorId: params.authorId,
      internal: params.internal ?? true,
      kind: 'NOTE',
    },
  })
}

export function updateNote(
  id: string,
  params: { body: string; editedBy: string }
) {
  return prisma.requestNote.update({
    where: { id },
    data: { body: params.body, editedAt: new Date() },
  })
}

export async function removeNote(params: {
  id: string
  deletedBy: string
}) {
  if (process.env.DELETION_MODE === 'hard') {
    await prisma.requestNote.delete({ where: { id: params.id } })
  } else {
    await prisma.requestNote.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: params.deletedBy,
      },
    })
  }

  return {
    object: 'request_note' as const,
    id: params.id,
    deleted: true as const,
  }
}
