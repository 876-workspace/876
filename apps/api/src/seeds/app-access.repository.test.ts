import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma } = vi.hoisted(() => ({
  prisma: {
    app: { findFirst: vi.fn() },
    appPermission: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    appRole: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/db/client', () => ({ prisma }))

const { upsertTemplateRole } = await import('./app-access.repository')

const role = {
  id: 'rol_template_admin',
  appId: 'app_commerce',
  key: 'admin',
  name: 'Admin',
  description: 'Administrative access.',
  permissions: ['settings.view', 'catalog.view', 'orders.view'],
  isSystem: true,
  isDefault: false,
  position: 10,
  now: BigInt(1_789_350_000),
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.appRole.findFirst.mockResolvedValue({ id: role.id })
  prisma.appRole.update.mockResolvedValue({})
  prisma.appRole.create.mockResolvedValue({})
  prisma.appRole.updateMany.mockResolvedValue({ count: 0 })
})

describe('upsertTemplateRole organization copy synchronization', () => {
  it('backfills permissions on live system copies when a template is updated', async () => {
    await upsertTemplateRole(role)

    expect(prisma.appRole.updateMany).toHaveBeenCalledWith({
      where: {
        appId: role.appId,
        organizationId: { not: null },
        key: role.key,
        templateKey: role.key,
        isSystem: true,
        deletedAt: null,
      },
      data: {
        permissions: role.permissions,
        updatedAt: role.now,
      },
    })
  })

  it('also repairs system copies when the platform template is first created', async () => {
    prisma.appRole.findFirst.mockResolvedValue(null)

    await upsertTemplateRole(role)

    expect(prisma.appRole.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: role.id,
        appId: role.appId,
        organizationId: null,
        key: role.key,
        permissions: role.permissions,
        isSystem: true,
      }),
    })
    expect(prisma.appRole.updateMany).toHaveBeenCalledTimes(1)
  })

  it('does not rewrite organization copies for a non-system template', async () => {
    await upsertTemplateRole({ ...role, key: 'custom', isSystem: false })

    expect(prisma.appRole.updateMany).not.toHaveBeenCalled()
  })
})
