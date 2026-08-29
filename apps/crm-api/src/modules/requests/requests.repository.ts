import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type {
  ListRequestsFilter,
  RequestChannel,
  RequestIntakeContext,
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
  priorityId: string
  channel?: RequestChannel
  teamId?: string | null
  assigneeId?: string | null
  requesterUserId?: string | null
  requesterContactId?: string | null
  createdBy: string
}

const requestInclude = { priority: true } as const

export function list(tenantId: string, filters?: ListRequestsFilter) {
  const where: NonNullable<
    Parameters<typeof prisma.request.findMany>[0]
  >['where'] = { tenantId, deletedAt: null }

  if (filters?.status) where.status = filters.status
  if (filters?.teamId !== undefined)
    where.teamId =
      filters.teamId === 'unassigned' || filters.teamId === 'none'
        ? null
        : filters.teamId
  if (filters?.assigneeId !== undefined)
    where.assigneeId =
      filters.assigneeId === 'unassigned' || filters.assigneeId === 'none'
        ? null
        : filters.assigneeId
  if (filters?.customerId) where.customerId = filters.customerId
  if (filters?.categoryId !== undefined) where.categoryId = filters.categoryId
  if (filters?.subcategoryId !== undefined)
    where.subcategoryId = filters.subcategoryId
  if (filters?.ownerId !== undefined)
    where.ownerId =
      filters.ownerId === 'unassigned' || filters.ownerId === 'none'
        ? null
        : filters.ownerId
  if (filters?.requesterUserId !== undefined)
    where.requesterUserId =
      filters.requesterUserId === 'unassigned' ||
      filters.requesterUserId === 'none'
        ? null
        : filters.requesterUserId
  if (filters?.priorityId) where.priorityId = filters.priorityId

  return prisma.request.findMany({
    where,
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
  })
}

export function retrieve(tenantId: string, id: string) {
  return prisma.request.findFirst({
    where: { tenantId, id, deletedAt: null },
    include: requestInclude,
  })
}

export function customerExists(tenantId: string, customerId: string) {
  return prisma.customerProfile.findFirst({
    where: { tenantId, id: customerId, deletedAt: null },
    select: { id: true },
  })
}

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
      priorityId: params.priorityId,
      channel: params.channel ?? 'AGENT',
      teamId: params.teamId ?? null,
      assigneeId: params.assigneeId ?? null,
      ownerId: params.ownerId ?? null,
      requesterUserId: params.requesterUserId ?? null,
      requesterContactId: params.requesterContactId ?? null,
      createdBy: params.createdBy,
    },
    include: requestInclude,
  })

  const description = params.description?.trim()
  if (description)
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

  return request
}

export function create(params: CreateParams) {
  return prisma.$transaction((tx) => insertRequest(tx, params))
}

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
    priorityId?: string
    channel?: RequestChannel
    teamId?: string | null
    assigneeId?: string | null
    requesterUserId?: string | null
    requesterContactId?: string | null
    resolvedAt?: Date | null
    closedAt?: Date | null
  }
) {
  return prisma.request.update({
    where: { id },
    data: params,
    include: requestInclude,
  })
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
  if (process.env.DELETION_MODE === 'hard')
    await prisma.request.delete({ where: { id: params.id } })
  else
    await prisma.request.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: params.deletedBy,
        deletionReason: params.reason?.trim() || null,
      },
    })

  return { object: 'request' as const, id: params.id, deleted: true as const }
}