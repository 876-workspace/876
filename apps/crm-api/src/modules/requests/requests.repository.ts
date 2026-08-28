import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type {
  ListRequestsFilter,
  RequestIntakeContext,
  RequestPriority,
  RequestSource,
  RequestStatus,
} from '../../types/request.js'

type CreateParams = {
  tenantId: string
  customerId: string
  subject: string
  description?: string | null
  categoryId?: string | null
  subcategoryId?: string | null
  ownerId?: string | null
  priority?: RequestPriority
  source?: RequestSource
  teamId?: string | null
  assigneeId?: string | null
  requesterUserId?: string | null
  requesterContactId?: string | null
  createdBy: string
}

export function list(tenantId: string, filters?: ListRequestsFilter) {
  const where: NonNullable<
    Parameters<typeof prisma.request.findMany>[0]
  >['where'] = {
    tenantId,
    deletedAt: null,
  }

  if (filters?.status) where.status = filters.status

  if (filters?.teamId !== undefined) {
    where.teamId =
      filters.teamId === 'unassigned' || filters.teamId === 'none'
        ? null
        : filters.teamId
  }

  if (filters?.assigneeId !== undefined) {
    where.assigneeId =
      filters.assigneeId === 'unassigned' || filters.assigneeId === 'none'
        ? null
        : filters.assigneeId
  }

  if (filters?.customerId) where.customerId = filters.customerId
  if (filters?.categoryId !== undefined) where.categoryId = filters.categoryId
  if (filters?.subcategoryId !== undefined)
    where.subcategoryId = filters.subcategoryId

  if (filters?.ownerId !== undefined) {
    where.ownerId =
      filters.ownerId === 'unassigned' || filters.ownerId === 'none'
        ? null
        : filters.ownerId
  }

  // 'unassigned'/'none' selects requests raised for the customer organization as
  // a whole, mirroring how ownerId spells its own null case.
  if (filters?.requesterUserId !== undefined) {
    where.requesterUserId =
      filters.requesterUserId === 'unassigned' ||
      filters.requesterUserId === 'none'
        ? null
        : filters.requesterUserId
  }

  if (filters?.priority) where.priority = filters.priority

  return prisma.request.findMany({
    where,
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

/**
 * Allocates the tenant's next request number, creates the Request, and records
 * the opening description as its DESCRIPTION note. Runs inside the caller's
 * transaction so number allocation and creation cannot drift apart.
 */
async function insertRequest(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: CreateParams
) {
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
      categoryId: params.categoryId ?? null,
      subcategoryId: params.subcategoryId ?? null,
      priority: params.priority ?? 'NORMAL',
      source: params.source ?? 'CRM',
      teamId: params.teamId ?? null,
      assigneeId: params.assigneeId ?? null,
      ownerId: params.ownerId ?? null,
      requesterUserId: params.requesterUserId ?? null,
      requesterContactId: params.requesterContactId ?? null,
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
}

export function create(params: CreateParams) {
  return prisma.$transaction((tx) => insertRequest(tx, params))
}

/**
 * Creates a Request and its intake submission in one transaction, so a form can
 * never record an answer set without the request it produced, or vice versa.
 */
export function createFromIntake(
  params: CreateParams,
  intake: RequestIntakeContext
) {
  return prisma.$transaction(async (tx) => {
    const request = await insertRequest(tx, params)

    const submission = await tx.requestFormSubmission.create({
      data: {
        id: `crm_sub_${randomUUID().replaceAll('-', '')}`,
        tenantId: params.tenantId,
        formId: intake.formId,
        requestId: request.id,
        formVersion: intake.formVersion,
        definitionSnapshot: JSON.parse(
          JSON.stringify(intake.definitionSnapshot)
        ),
        answers: JSON.parse(JSON.stringify(intake.answers)),
        customerOrganizationId: intake.customerOrganizationId ?? null,
        customerUserId: intake.customerUserId ?? null,
        requesterUserId: params.requesterUserId ?? null,
        requesterContactId: params.requesterContactId ?? null,
        createdBy: params.createdBy,
      },
    })

    return { request, submission }
  })
}

export function update(
  id: string,
  params: {
    subject?: string
    categoryId?: string | null
    subcategoryId?: string | null
    ownerId?: string | null
    status?: RequestStatus
    priority?: RequestPriority
    source?: RequestSource
    teamId?: string | null
    assigneeId?: string | null
    requesterUserId?: string | null
    requesterContactId?: string | null
    resolvedAt?: Date | null
    closedAt?: Date | null
  }
) {
  return prisma.request.update({ where: { id }, data: params })
}

export function categoryExists(tenantId: string, id: string) {
  return prisma.requestCategoryDef.findFirst({
    where: { tenantId, id, deletedAt: null, isActive: true },
  })
}

export function subcategoryExists(tenantId: string, id: string) {
  return prisma.requestSubcategory.findFirst({
    where: { tenantId, id, deletedAt: null, isActive: true },
  })
}

export function teamExists(tenantId: string, id: string) {
  return prisma.team.findFirst({
    where: { tenantId, id, deletedAt: null, status: 'ACTIVE' },
  })
}

export function isTeamMember(tenantId: string, teamId: string, userId: string) {
  return prisma.teamMember.findFirst({
    where: { tenantId, teamId, userId },
    select: { id: true },
  })
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

export function listNotes(
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

export function retrieveNote(tenantId: string, requestId: string, id: string) {
  return prisma.requestNote.findFirst({
    where: { tenantId, requestId, id, deletedAt: null },
  })
}

export function createNote(params: {
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
      id: `crm_note_${randomUUID().replaceAll('-', '')}`,
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

export function updateNote(
  id: string,
  params: { body: string; editedBy: string }
) {
  return prisma.requestNote.update({
    where: { id },
    data: { body: params.body, editedAt: new Date() },
  })
}

export async function removeNote(params: { id: string; deletedBy: string }) {
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
