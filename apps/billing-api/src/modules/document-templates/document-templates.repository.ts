import type { DocumentTemplateType } from '@876/core/document-templates'
import { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { isUniqueConstraintError } from '@/platform/prisma-errors'

function liveWhere(tenantId: string, id: string) {
  return { id, tenantId, deletedAt: null }
}

export const documentTemplatesRepository = {
  list(tenantId: string, documentType?: DocumentTemplateType) {
    return prisma.documentTemplate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(documentType ? { documentType } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
  },
  retrieve(tenantId: string, id: string) {
    return prisma.documentTemplate.findFirst({ where: liveWhere(tenantId, id) })
  },
  retrieveDefault(tenantId: string, documentType: DocumentTemplateType) {
    return prisma.documentTemplate.findFirst({
      where: { tenantId, documentType, isDefault: true, deletedAt: null },
    })
  },
  async create(input: {
    id: string
    tenantId: string
    documentType: DocumentTemplateType
    name: string
    layout: string
    settings: Prisma.InputJsonValue
    isDefault: boolean
    schemaVersion: number
    actorId: string | null
    now: number
  }) {
    const create = (forceNonDefault: boolean) =>
      prisma.$transaction(async (tx) => {
        const count = await tx.documentTemplate.count({
          where: {
            tenantId: input.tenantId,
            documentType: input.documentType,
            deletedAt: null,
          },
        })
        if (count >= 25) return null

        const isDefault = !forceNonDefault && (input.isDefault || count === 0)
        if (isDefault)
          await tx.documentTemplate.updateMany({
            where: {
              tenantId: input.tenantId,
              documentType: input.documentType,
              deletedAt: null,
            },
            data: {
              isDefault: false,
              updatedAt: input.now,
              updatedBy: input.actorId,
            },
          })
        return tx.documentTemplate.create({
          data: {
            ...input,
            isDefault,
            createdBy: input.actorId,
            updatedBy: input.actorId,
            createdAt: input.now,
            updatedAt: input.now,
          },
        })
      })

    try {
      return await create(false)
    } catch (error) {
      // Two concurrent first creates can both observe an empty type. The
      // partial unique index correctly lets only one become default; retry the
      // losing create once as a non-default instead of leaking a Prisma error.
      if (!isUniqueConstraintError(error)) throw error
      return create(true)
    }
  },
  async update(input: {
    tenantId: string
    id: string
    data: { name?: string; layout?: string; settings?: Prisma.InputJsonValue }
    actorId: string | null
    now: number
  }) {
    const result = await prisma.documentTemplate.updateMany({
      where: liveWhere(input.tenantId, input.id),
      data: { ...input.data, updatedAt: input.now, updatedBy: input.actorId },
    })
    return result.count > 0 ? this.retrieve(input.tenantId, input.id) : null
  },
  async setDefault(
    tenantId: string,
    id: string,
    actorId: string | null,
    now: number
  ) {
    return prisma.$transaction(async (tx) => {
      const template = await tx.documentTemplate.findFirst({
        where: liveWhere(tenantId, id),
      })
      if (!template) return null
      await tx.documentTemplate.updateMany({
        where: {
          tenantId,
          documentType: template.documentType,
          deletedAt: null,
        },
        data: { isDefault: false, updatedAt: now, updatedBy: actorId },
      })
      return tx.documentTemplate.update({
        where: { id: template.id },
        data: { isDefault: true, updatedAt: now, updatedBy: actorId },
      })
    })
  },
  async delete(
    tenantId: string,
    id: string,
    actorId: string | null,
    now: number,
    hard: boolean
  ) {
    const template = await prisma.documentTemplate.findFirst({
      where: liveWhere(tenantId, id),
    })
    if (!template) return null
    if (hard) {
      await prisma.documentTemplate.delete({ where: { id: template.id } })
    } else {
      await prisma.documentTemplate.update({
        where: { id: template.id },
        data: {
          deletedAt: now,
          deletedBy: actorId,
          deletionReason: 'Deleted by user.',
          isDefault: false,
        },
      })
    }
    return template
  },
  retrieveBranding(tenantId: string) {
    return prisma.brandingPreference.findUnique({ where: { tenantId } })
  },
  async updateBranding(input: {
    tenantId: string
    data: { accentColor: string; appearance: string; sidebarTone: string }
    actorId: string | null
    now: number
    useDefaults: boolean
  }) {
    if (input.useDefaults) {
      await prisma.brandingPreference.deleteMany({
        where: { tenantId: input.tenantId },
      })
      return null
    }
    return prisma.brandingPreference.upsert({
      where: { tenantId: input.tenantId },
      create: {
        tenantId: input.tenantId,
        ...input.data,
        updatedBy: input.actorId,
        createdAt: input.now,
        updatedAt: input.now,
      },
      update: { ...input.data, updatedBy: input.actorId, updatedAt: input.now },
    })
  },
}
