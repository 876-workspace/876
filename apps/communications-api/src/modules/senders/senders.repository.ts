import { prisma } from '../../db/index.js'

export async function list(organizationId: string) {
  return prisma.emailSender.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function retrieve(organizationId: string, id: string) {
  return prisma.emailSender.findFirst({
    where: { organizationId, id, deletedAt: null },
  })
}

export async function retrieveByEmail(organizationId: string, email: string) {
  return prisma.emailSender.findFirst({
    where: {
      organizationId,
      email: { equals: email, mode: 'insensitive' },
      deletedAt: null,
    },
  })
}

export async function countActive(organizationId: string) {
  return prisma.emailSender.count({
    where: { organizationId, isActive: true, deletedAt: null },
  })
}

export async function create(input: {
  id: string
  organizationId: string
  domainId: string | null
  name: string
  email: string
  replyTo: string | null
  kind: string
  isDefault: boolean
  now: bigint
}) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.emailSender.updateMany({
        where: { organizationId: input.organizationId, deletedAt: null },
        data: { isDefault: false, updatedAt: input.now },
      })
    }

    return tx.emailSender.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        domainId: input.domainId,
        name: input.name,
        email: input.email,
        replyTo: input.replyTo,
        kind: input.kind,
        isDefault: input.isDefault,
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
  name?: string
  email?: string
  replyTo?: string | null
  domainId?: string | null
  isDefault?: boolean
  isActive?: boolean
  now: bigint
}) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.emailSender.updateMany({
        where: {
          organizationId: input.organizationId,
          deletedAt: null,
          NOT: { id: input.id },
        },
        data: { isDefault: false, updatedAt: input.now },
      })
    }

    const updated = await tx.emailSender.updateMany({
      where: {
        id: input.id,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.replyTo !== undefined ? { replyTo: input.replyTo } : {}),
        ...(input.domainId !== undefined ? { domainId: input.domainId } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: input.now,
      },
    })
    if (updated.count !== 1)
      throw new Error('Sender identity disappeared during update.')

    return tx.emailSender.findUniqueOrThrow({ where: { id: input.id } })
  })
}

export async function softDelete(input: {
  id: string
  organizationId: string
  deletedBy: string | null
  deletionReason: string | null
  now: bigint
}) {
  const updated = await prisma.emailSender.updateMany({
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
  if (updated.count !== 1)
    throw new Error('Sender identity disappeared during deletion.')

  return prisma.emailSender.findUniqueOrThrow({ where: { id: input.id } })
}
