import { beforeEach, describe, expect, it, vi } from 'vitest'

const collaborators = vi.hoisted(() => ({
  findAppForAccessById: vi.fn(),
  listRoles: vi.fn(),
  findRoleByKey: vi.fn(),
  updateRole: vi.fn(),
  createRole: vi.fn(),
}))

vi.mock('@/modules/apps', () => ({
  findAppForAccessById: collaborators.findAppForAccessById,
}))
vi.mock('../app-access.repository', () => ({
  listRoles: collaborators.listRoles,
  findRoleByKey: collaborators.findRoleByKey,
  updateRole: collaborators.updateRole,
  createRole: collaborators.createRole,
}))
vi.mock('@/platform/ids', () => ({ generateId: () => 'rol_new' }))
vi.mock('@/platform/timestamps', () => ({
  nowUnixSeconds: () => 1_789_350_000,
}))

const { materializeRoleTemplatesForApp } =
  await import('../app-access-role-templates.service')

const APP = { id: 'app_commerce', slug: '876-commerce', name: 'Commerce' }
const ORG = 'org_kingston'
const template = {
  id: 'rol_template_admin',
  appId: APP.id,
  organizationId: null,
  key: 'admin',
  name: 'Admin',
  description: 'Administrative access.',
  permissions: ['settings.view', 'catalog.view', 'orders.view'],
  isSystem: true,
  isDefault: false,
  templateKey: null,
  position: 10,
  deletedAt: null,
}

function organizationRole(
  overrides: Partial<{
    permissions: string[]
    isSystem: boolean
    templateKey: string | null
  }> = {}
) {
  return {
    ...template,
    id: 'rol_org_admin',
    organizationId: ORG,
    permissions: ['settings.view'],
    isSystem: true,
    templateKey: 'admin',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  collaborators.findAppForAccessById.mockResolvedValue(APP)
  collaborators.listRoles.mockResolvedValue([template])
  collaborators.findRoleByKey.mockResolvedValue(null)
  collaborators.updateRole.mockResolvedValue(
    organizationRole({
      permissions: [...template.permissions],
    })
  )
  collaborators.createRole.mockResolvedValue(organizationRole())
})

describe('materializeRoleTemplatesForApp', () => {
  it('creates a missing organization role from the platform template', async () => {
    const result = await materializeRoleTemplatesForApp({
      organizationId: ORG,
      appId: APP.id,
    })

    expect(result).toEqual({ seeded: 1, synced: 0, skipped: 0 })
    expect(collaborators.createRole).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rol_new',
        appId: APP.id,
        organizationId: ORG,
        key: 'admin',
        permissions: template.permissions,
        isSystem: true,
        templateKey: 'admin',
      })
    )
  })

  it('synchronizes only permissions on a canonical system-role copy', async () => {
    collaborators.findRoleByKey.mockResolvedValue(organizationRole())

    const result = await materializeRoleTemplatesForApp({
      organizationId: ORG,
      appId: APP.id,
    })

    expect(result).toEqual({ seeded: 0, synced: 1, skipped: 0 })
    expect(collaborators.updateRole).toHaveBeenCalledWith(
      'rol_org_admin',
      APP.id,
      ORG,
      {
        permissions: template.permissions,
        updatedAt: BigInt(1_789_350_000),
      }
    )
    expect(collaborators.createRole).not.toHaveBeenCalled()
  })

  it('leaves a custom same-key organization role untouched', async () => {
    collaborators.findRoleByKey.mockResolvedValue(
      organizationRole({ isSystem: false, templateKey: null })
    )

    const result = await materializeRoleTemplatesForApp({
      organizationId: ORG,
      appId: APP.id,
    })

    expect(result).toEqual({ seeded: 0, synced: 0, skipped: 1 })
    expect(collaborators.updateRole).not.toHaveBeenCalled()
  })

  it('leaves an unrelated system-role copy untouched', async () => {
    collaborators.findRoleByKey.mockResolvedValue(
      organizationRole({ templateKey: 'legacy-admin' })
    )

    const result = await materializeRoleTemplatesForApp({
      organizationId: ORG,
      appId: APP.id,
    })

    expect(result).toEqual({ seeded: 0, synced: 0, skipped: 1 })
    expect(collaborators.updateRole).not.toHaveBeenCalled()
  })

  it('skips an already synchronized system-role copy', async () => {
    collaborators.findRoleByKey.mockResolvedValue(
      organizationRole({ permissions: [...template.permissions] })
    )

    const result = await materializeRoleTemplatesForApp({
      organizationId: ORG,
      appId: APP.id,
    })

    expect(result).toEqual({ seeded: 0, synced: 0, skipped: 1 })
    expect(collaborators.updateRole).not.toHaveBeenCalled()
  })

  it('fails closed when a required system-role synchronization cannot persist', async () => {
    collaborators.findRoleByKey.mockResolvedValue(organizationRole())
    collaborators.updateRole.mockResolvedValue(null)

    await expect(
      materializeRoleTemplatesForApp({ organizationId: ORG, appId: APP.id })
    ).rejects.toThrow('Failed to synchronize system app role')
  })

  it('keeps 876 Enterprise outside the app-role plane', async () => {
    collaborators.findAppForAccessById.mockResolvedValue({
      id: 'app_enterprise',
      slug: '876-enterprise',
      name: 'Enterprise',
    })

    const result = await materializeRoleTemplatesForApp({
      organizationId: ORG,
      appId: 'app_enterprise',
    })

    expect(result).toEqual({ seeded: 0, synced: 0, skipped: 0 })
    expect(collaborators.listRoles).not.toHaveBeenCalled()
  })
})
