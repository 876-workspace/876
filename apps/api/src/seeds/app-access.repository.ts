import { prisma } from '@/db/client'

export function findAppBySlug(slug: string) {
  return prisma.app.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true },
  })
}

export function findTemplateRole(appId: string, key: string) {
  return prisma.appRole.findFirst({
    where: { appId, organizationId: null, key, deletedAt: null },
  })
}

export async function upsertPermission(params: {
  id: string
  appId: string
  key: string
  moduleKey: string
  action: string
  label: string
  description: string | null
  isDangerous: boolean
  position: number
  now: bigint
}): Promise<'created' | 'updated'> {
  const existing = await prisma.appPermission.findFirst({
    where: { appId: params.appId, key: params.key },
    select: { id: true },
  })

  if (existing) {
    await prisma.appPermission.update({
      where: { id: existing.id },
      data: {
        moduleKey: params.moduleKey,
        action: params.action,
        label: params.label,
        description: params.description,
        isDangerous: params.isDangerous,
        position: params.position,
        updatedAt: params.now,
      },
    })
    return 'updated'
  }

  await prisma.appPermission.create({
    data: {
      id: params.id,
      appId: params.appId,
      key: params.key,
      moduleKey: params.moduleKey,
      action: params.action,
      label: params.label,
      description: params.description,
      isDangerous: params.isDangerous,
      position: params.position,
      createdAt: params.now,
      updatedAt: params.now,
    },
  })
  return 'created'
}

export async function upsertTemplateRole(params: {
  id: string
  appId: string
  key: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  isDefault: boolean
  position: number
  now: bigint
}): Promise<'created' | 'updated'> {
  const existing = await findTemplateRole(params.appId, params.key)
  if (existing) {
    await prisma.appRole.update({
      where: { id: existing.id },
      data: {
        name: params.name,
        description: params.description,
        permissions: params.permissions,
        isSystem: params.isSystem,
        isDefault: params.isDefault,
        position: params.position,
        updatedAt: params.now,
      },
    })
    return 'updated'
  }

  await prisma.appRole.create({
    data: {
      id: params.id,
      appId: params.appId,
      organizationId: null,
      key: params.key,
      name: params.name,
      description: params.description,
      permissions: params.permissions,
      isSystem: params.isSystem,
      isDefault: params.isDefault,
      templateKey: null,
      position: params.position,
      createdAt: params.now,
      updatedAt: params.now,
    },
  })
  return 'created'
}

export async function setTemplateDefault(
  appId: string,
  defaultKey: string,
  now: bigint
): Promise<void> {
  await prisma.$transaction([
    prisma.appRole.updateMany({
      where: { appId, organizationId: null, deletedAt: null },
      data: { isDefault: false, updatedAt: now },
    }),
    prisma.appRole.updateMany({
      where: { appId, organizationId: null, key: defaultKey, deletedAt: null },
      data: { isDefault: true, updatedAt: now },
    }),
  ])
}
