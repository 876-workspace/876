import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type {
  CreateRequestFormInput,
  RequestFormStatus,
  UpdateRequestFormInput,
} from '../../types/request-form.js'

const id = () => `crm_form_${randomUUID().replaceAll('-', '')}`

export function list(tenantId: string, status?: RequestFormStatus) {
  return prisma.requestForm.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  })
}

export function retrieve(tenantId: string, formId: string) {
  return prisma.requestForm.findFirst({
    where: { tenantId, id: formId, deletedAt: null },
  })
}

export function retrieveBySlug(tenantId: string, slug: string) {
  return prisma.requestForm.findFirst({
    where: { tenantId, slug, deletedAt: null },
  })
}

export function create(tenantId: string, input: CreateRequestFormInput) {
  return prisma.requestForm.create({
    data: {
      id: id(),
      tenantId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      definition: JSON.parse(JSON.stringify(input.definition)),
      ...(input.placement ? { placement: input.placement } : {}),
      defaultCategoryId: input.defaultCategoryId ?? null,
      defaultSubcategoryId: input.defaultSubcategoryId ?? null,
      defaultTeamId: input.defaultTeamId ?? null,
      defaultPriority: input.defaultPriority ?? null,
      confirmationTitle: input.confirmationTitle ?? null,
      confirmationMessage: input.confirmationMessage ?? null,
      createdBy: input.createdBy,
    },
  })
}

export function update(
  formId: string,
  input: UpdateRequestFormInput & {
    publishedDefinition?: unknown
    version?: number
    publishedAt?: Date | null
  }
) {
  const { definition, publishedDefinition, ...data } = input

  return prisma.requestForm.update({
    where: { id: formId },
    data: {
      ...data,
      ...(definition
        ? { definition: JSON.parse(JSON.stringify(definition)) }
        : {}),
      ...(publishedDefinition !== undefined
        ? {
            publishedDefinition: JSON.parse(
              JSON.stringify(publishedDefinition)
            ),
          }
        : {}),
    },
  })
}

export function submissionCount(tenantId: string, formId: string) {
  return prisma.requestFormSubmission.count({
    where: { tenantId, formId },
  })
}

export async function remove(params: {
  id: string
  slug: string
  deletedBy: string
  reason?: string | null
}) {
  if (process.env.DELETION_MODE === 'hard') {
    await prisma.requestForm.delete({ where: { id: params.id } })
  } else {
    // `(tenant_id, slug)` is unique across every row, deleted or not, so a soft
    // delete must release the slug — otherwise recreating a form under the name
    // it used to have fails on a constraint the service cannot see.
    const deletedAt = new Date()
    await prisma.requestForm.update({
      where: { id: params.id },
      data: {
        status: 'ARCHIVED',
        slug: `${params.slug}__deleted_${deletedAt.getTime()}`.slice(0, 100),
        deletedAt,
        deletedBy: params.deletedBy,
        deletionReason: params.reason?.trim() || null,
      },
    })
  }

  return {
    object: 'request_form' as const,
    id: params.id,
    deleted: true as const,
  }
}

export function listSubmissions(tenantId: string, formId: string) {
  return prisma.requestFormSubmission.findMany({
    where: { tenantId, formId },
    orderBy: { createdAt: 'desc' },
  })
}

export function retrieveSubmissionByRequest(
  tenantId: string,
  requestId: string
) {
  return prisma.requestFormSubmission.findFirst({
    where: { tenantId, requestId },
  })
}
