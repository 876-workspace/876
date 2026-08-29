import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type {
  CreateRequestFormInput,
  RequestFormDefinition,
  RequestFormPlacement,
  RequestFormStatus,
  UpdateRequestFormInput,
} from '../../types/request-form.js'

const id = () => `crm_form_${randomUUID().replaceAll('-', '')}`

export type ProvisionedRequestFormInput = {
  provisioningKey: string
  name: string
  slug: string
  description: string | null
  placement: RequestFormPlacement
  definition: RequestFormDefinition
  defaultCategoryId: string | null
  defaultSubcategoryId: string | null
  defaultTeamId: string | null
  defaultPriorityId: string | null
  confirmationTitle: string | null
  confirmationMessage: string | null
}

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

export function retrieveByProvisioningKey(
  tenantId: string,
  provisioningKey: string
) {
  return prisma.requestForm.findFirst({
    where: { tenantId, provisioningKey },
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
      defaultPriorityId: input.defaultPriorityId ?? null,
      confirmationTitle: input.confirmationTitle ?? null,
      confirmationMessage: input.confirmationMessage ?? null,
      createdBy: input.createdBy,
    },
  })
}

export async function ensureProvisioned(
  tenantId: string,
  input: ProvisionedRequestFormInput
) {
  const existing = await retrieveByProvisioningKey(
    tenantId,
    input.provisioningKey
  )
  if (existing && !existing.deletedAt) return existing

  const publishedAt = new Date()
  const definition = JSON.parse(JSON.stringify(input.definition))

  if (existing) {
    return prisma.requestForm.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        status: 'PUBLISHED',
        placement: input.placement,
        definition,
        publishedDefinition: definition,
        version: Math.max(existing.version, 1),
        defaultCategoryId: input.defaultCategoryId,
        defaultSubcategoryId: input.defaultSubcategoryId,
        defaultTeamId: input.defaultTeamId,
        defaultPriorityId: input.defaultPriorityId,
        confirmationTitle: input.confirmationTitle,
        confirmationMessage: input.confirmationMessage,
        publishedAt: existing.publishedAt ?? publishedAt,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
    })
  }

  try {
    return await prisma.requestForm.create({
      data: {
        id: id(),
        tenantId,
        provisioningKey: input.provisioningKey,
        name: input.name,
        slug: input.slug,
        description: input.description,
        status: 'PUBLISHED',
        placement: input.placement,
        definition,
        publishedDefinition: definition,
        version: 1,
        defaultCategoryId: input.defaultCategoryId,
        defaultSubcategoryId: input.defaultSubcategoryId,
        defaultTeamId: input.defaultTeamId,
        defaultPriorityId: input.defaultPriorityId,
        confirmationTitle: input.confirmationTitle,
        confirmationMessage: input.confirmationMessage,
        createdBy: 'system',
        publishedAt,
      },
    })
  } catch (error) {
    // Console ensures this fixture on every requests render, so two concurrent
    // cold loads can both read nothing and both insert. The tenant-scoped
    // unique index decides the winner; the loser re-reads it rather than
    // failing the page.
    if ((error as { code?: string }).code !== 'P2002') throw error
    const winner = await retrieveByProvisioningKey(
      tenantId,
      input.provisioningKey
    )
    if (!winner) throw error
    return winner
  }
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
