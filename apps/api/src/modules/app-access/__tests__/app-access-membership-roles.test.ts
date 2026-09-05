import { beforeEach, describe, expect, it, vi } from 'vitest'

const collaborators = vi.hoisted(() => ({
  findAppForAccessById: vi.fn(),
  findAppForAccessBySlug: vi.fn(),
  findMembershipForAccess: vi.fn(),
  requireOrgAppAccessPermission: vi.fn(),
  getOrgAppEntitlement: vi.fn(),
  findRole: vi.fn(),
  listRoles: vi.fn(),
  listPermissions: vi.fn(),
  findAssignmentForUserApp: vi.fn(),
  createAssignment: vi.fn(),
}))

vi.mock('@/modules/apps', () => ({
  findAppForAccessById: collaborators.findAppForAccessById,
  findAppForAccessBySlug: collaborators.findAppForAccessBySlug,
  listAppsForAccess: vi.fn(),
}))
vi.mock('@/modules/memberships', () => ({
  findMembershipForAccess: collaborators.findMembershipForAccess,
  findMembershipForAccessById: vi.fn(),
  listMembershipsForAccess: vi.fn(),
}))
vi.mock('@/modules/organizations', () => ({
  getOrgAppEntitlement: collaborators.getOrgAppEntitlement,
  listOrgAppEntitlements: vi.fn(),
  requireOrgAppAccessPermission: collaborators.requireOrgAppAccessPermission,
  requireOrgAppAccessRead: vi.fn(),
}))
vi.mock('../app-access.repository', () => ({
  findRole: collaborators.findRole,
  listRoles: collaborators.listRoles,
  listPermissions: collaborators.listPermissions,
  findAssignmentForUserApp: collaborators.findAssignmentForUserApp,
  createAssignment: collaborators.createAssignment,
}))
vi.mock('@/platform/ids', () => ({ generateId: () => 'apa_new' }))
vi.mock('@/platform/timestamps', () => ({
  nowUnixSeconds: () => 1785000000,
  fromDbUnixSeconds: (value: bigint) => Number(value),
  nullableFromDbUnixSeconds: (value: bigint | null) =>
    value === null ? null : Number(value),
}))

const { createAppMembership } = await import('../app-access.service')

const ORG = 'org_kingstonlabs'
const APP = { id: 'app_comments', slug: 'comments', name: 'Comments' }
const defaultRole = {
  id: 'rol_default',
  appId: APP.id,
  organizationId: ORG,
  key: 'member',
  name: 'Member',
  description: null,
  permissions: ['comments.view'],
  isSystem: true,
  isDefault: true,
  templateKey: 'member',
  position: 10,
  deletedAt: null,
  deletedBy: null,
  deletionReason: null,
  createdAt: 1n,
  updatedAt: 1n,
}
const superAdminRole = {
  ...defaultRole,
  id: 'rol_super',
  key: 'super-admin',
  name: 'Super admin',
  permissions: ['comments.create', 'comments.view'],
  isDefault: false,
}
const assignment = {
  id: 'apa_new',
  organizationId: ORG,
  userId: 'user_target',
  appId: APP.id,
  appRoleId: 'rol_super',
  status: 'active',
  permissionGrants: [],
  permissionDenies: [],
  title: null,
  attributes: null,
  assignedBy: null,
  assignedAt: 1785000000n,
  lastAccessAt: null,
  revokedAt: null,
  revokedBy: null,
  deletedAt: null,
  deletedBy: null,
  deletionReason: null,
  createdAt: 1785000000n,
  updatedAt: 1785000000n,
  appRole: superAdminRole,
}

beforeEach(() => {
  vi.clearAllMocks()
  collaborators.findAppForAccessById.mockResolvedValue(APP)
  collaborators.getOrgAppEntitlement.mockResolvedValue({ status: 'active' })
  collaborators.findMembershipForAccess.mockResolvedValue({
    id: 'mem_target',
    organization_id: ORG,
    user_id: 'user_target',
    status: 'active',
    role: 'member',
  })
  collaborators.listRoles.mockResolvedValue([defaultRole, superAdminRole])
  collaborators.listPermissions.mockResolvedValue([
    { key: 'comments.view' },
    { key: 'comments.create' },
  ])
  collaborators.findAssignmentForUserApp.mockResolvedValue(null)
  collaborators.createAssignment.mockResolvedValue(assignment)
})

describe('createAppMembership role resolution', () => {
  it('rejects a non-super-admin caller explicitly requesting the super-admin app role', async () => {
    collaborators.findRole.mockResolvedValue(superAdminRole)
    collaborators.findMembershipForAccess
      .mockResolvedValueOnce({
        id: 'mem_target',
        organization_id: ORG,
        user_id: 'user_target',
        status: 'active',
        role: 'member',
      })
      .mockResolvedValueOnce({
        id: 'mem_caller',
        organization_id: ORG,
        user_id: 'user_caller',
        status: 'active',
        role: 'admin',
      })

    await expect(
      createAppMembership(
        ORG,
        {
          user_id: 'user_target',
          app_id: APP.id,
          app_role_id: 'rol_super',
          permission_grants: [],
          permission_denies: [],
          status: 'active',
        },
        { internal: false, userId: 'user_caller' }
      )
    ).rejects.toMatchObject({
      code: 'app-membership/super-admin-required',
      message:
        'Only a super admin can assign the super admin application role.',
      httpStatus: 403,
    })
    expect(collaborators.createAssignment).not.toHaveBeenCalled()
  })

  it('automatically persists super-admin for a super_admin subject without treating it as caller elevation', async () => {
    collaborators.findMembershipForAccess.mockResolvedValue({
      id: 'mem_target',
      organization_id: ORG,
      user_id: 'user_target',
      status: 'active',
      role: 'super_admin',
    })

    await createAppMembership(
      ORG,
      {
        user_id: 'user_target',
        app_id: APP.id,
        permission_grants: [],
        permission_denies: [],
        status: 'active',
      },
      { internal: true, userId: null }
    )

    expect(collaborators.listRoles).toHaveBeenCalledWith(APP.id, ORG)
    expect(collaborators.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'apa_new',
        organizationId: ORG,
        userId: 'user_target',
        appId: APP.id,
        appRoleId: 'rol_super',
        status: 'active',
        permissionGrants: [],
        permissionDenies: [],
        assignedBy: null,
        assignedAt: 1785000000n,
        createdAt: 1785000000n,
        updatedAt: 1785000000n,
      })
    )
  })

  it('assigns an ordinary member the default role without comments.create effective permission', async () => {
    const defaultAssignment = {
      ...assignment,
      appRoleId: 'rol_default',
      appRole: defaultRole,
    }
    collaborators.listRoles.mockResolvedValue([defaultRole, superAdminRole])
    collaborators.createAssignment.mockResolvedValue(defaultAssignment)

    const result = await createAppMembership(
      ORG,
      {
        user_id: 'user_target',
        app_id: APP.id,
        permission_grants: [],
        permission_denies: [],
        status: 'active',
      },
      { internal: true, userId: null }
    )

    expect(collaborators.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ appRoleId: 'rol_default' })
    )
    expect(result).toEqual({
      object: 'app_membership',
      id: 'apa_new',
      organization_id: ORG,
      user_id: 'user_target',
      membership_id: 'mem_target',
      app_id: APP.id,
      app_slug: 'comments',
      app_name: 'Comments',
      status: 'active',
      assigned: true,
      entitled: true,
      app_role: {
        object: 'app_role',
        id: 'rol_default',
        app_id: APP.id,
        organization_id: ORG,
        key: 'member',
        name: 'Member',
        description: null,
        permissions: ['comments.view'],
        is_system: true,
        is_default: true,
        template_key: 'member',
        position: 10,
        members_count: null,
        created_at: 1,
        updated_at: 1,
      },
      permission_grants: [],
      permission_denies: [],
      effective_permissions: ['comments.view'],
      title: null,
      attributes: null,
      assigned_by: null,
      assigned_at: 1785000000,
      last_access_at: null,
      revoked_at: null,
      created_at: 1785000000,
      updated_at: 1785000000,
    })
  })

  it('persists an explicitly requested role for a super-admin operator', async () => {
    collaborators.findRole.mockResolvedValue(superAdminRole)
    collaborators.findMembershipForAccess
      .mockResolvedValueOnce({
        id: 'mem_target',
        organization_id: ORG,
        user_id: 'user_target',
        status: 'active',
        role: 'member',
      })
      .mockResolvedValueOnce({
        id: 'mem_caller',
        organization_id: ORG,
        user_id: 'user_caller',
        status: 'active',
        role: 'super_admin',
      })

    await createAppMembership(
      ORG,
      {
        user_id: 'user_target',
        app_id: APP.id,
        app_role_id: 'rol_super',
        permission_grants: [],
        permission_denies: [],
        status: 'active',
      },
      { internal: false, userId: 'user_caller' }
    )

    expect(collaborators.findRole).toHaveBeenCalledWith(
      APP.id,
      ORG,
      'rol_super'
    )
    expect(collaborators.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        appRoleId: 'rol_super',
        assignedBy: 'user_caller',
      })
    )
  })
})
