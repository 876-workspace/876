import { prisma } from '../../db/index.js'

export async function list(organizationId: string) {
  return prisma.emailTemplate.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [{ organizationId }, { organizationId: null, isSystem: true }],
    },
    orderBy: [{ category: 'asc' }, { isDefault: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function retrieve(organizationId: string, id: string) {
  return prisma.emailTemplate.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: [{ organizationId }, { organizationId: null, isSystem: true }],
    },
  })
}

export async function retrieveOwned(organizationId: string, id: string) {
  return prisma.emailTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
  })
}

export async function retrieveByKey(organizationId: string, key: string) {
  return prisma.emailTemplate.findFirst({
    where: { organizationId, key, deletedAt: null },
  })
}

export async function retrieveDefault(
  organizationId: string,
  category: string
) {
  const organizationTemplate = await prisma.emailTemplate.findFirst({
    where: {
      organizationId,
      category,
      isDefault: true,
      isActive: true,
      deletedAt: null,
    },
  })
  if (organizationTemplate) return organizationTemplate

  return prisma.emailTemplate.findFirst({
    where: {
      organizationId: null,
      category,
      isDefault: true,
      isSystem: true,
      isActive: true,
      deletedAt: null,
    },
  })
}

export async function create(input: {
  id: string
  organizationId: string
  key: string
  name: string
  category: string
  subject: string
  html: string
  text: string | null
  senderId: string | null
  isDefault: boolean
  now: bigint
}) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.emailTemplate.updateMany({
        where: {
          organizationId: input.organizationId,
          category: input.category,
          deletedAt: null,
        },
        data: { isDefault: false, updatedAt: input.now },
      })
    }

    return tx.emailTemplate.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        key: input.key,
        name: input.name,
        category: input.category,
        subject: input.subject,
        html: input.html,
        text: input.text,
        senderId: input.senderId,
        isDefault: input.isDefault,
        isSystem: false,
        isActive: true,
        createdAt: input.now,
        updatedAt: input.now,
      },
    })
  })
}

export async function update(input: {
  id: string
  organizationId: string
  key?: string
  name?: string
  category?: string
  subject?: string
  html?: string
  text?: string | null
  senderId?: string | null
  isDefault?: boolean
  isActive?: boolean
  now: bigint
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.emailTemplate.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
        deletedAt: null,
      },
    })
    if (!current) return null

    const nextCategory = input.category ?? current.category
    if (input.isDefault) {
      await tx.emailTemplate.updateMany({
        where: {
          organizationId: input.organizationId,
          category: nextCategory,
          deletedAt: null,
          NOT: { id: input.id },
        },
        data: { isDefault: false, updatedAt: input.now },
      })
    }

    await tx.emailTemplate.updateMany({
      where: {
        id: input.id,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      data: {
        ...(input.key !== undefined ? { key: input.key } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.html !== undefined ? { html: input.html } : {}),
        ...(input.text !== undefined ? { text: input.text } : {}),
        ...(input.senderId !== undefined ? { senderId: input.senderId } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: input.now,
      },
    })

    return tx.emailTemplate.findUniqueOrThrow({ where: { id: input.id } })
  })
}

export async function softDelete(input: {
  id: string
  organizationId: string
  deletedBy: string | null
  deletionReason: string | null
  now: bigint
}) {
  const updated = await prisma.emailTemplate.updateMany({
    where: {
      id: input.id,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    data: {
      isActive: false,
      isDefault: false,
      deletedAt: input.now,
      deletedBy: input.deletedBy,
      deletionReason: input.deletionReason,
      updatedAt: input.now,
    },
  })
  return updated.count === 1
}
