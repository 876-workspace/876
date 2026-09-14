import { beforeEach, describe, expect, it, vi } from 'vitest'

const modules = vi.hoisted(() => ({
  listEntitledModules: vi.fn(),
}))
const apps = vi.hoisted(() => ({
  findAppForAccessById: vi.fn(),
  findAppForAccessBySlug: vi.fn(),
  listAppsForAccess: vi.fn(),
}))
const memberships = vi.hoisted(() => ({
  findMembershipForAccess: vi.fn(),
  findMembershipForAccessById: vi.fn(),
  listMembershipsForAccess: vi.fn(),
}))
const organizations = vi.hoisted(() => ({
  findActiveMembershipWithRoleForRoleBackfill: vi.fn(),
  getOrgAppEntitlement: vi.fn(),
  listOrgAppEntitlements: vi.fn(),
  requireOrgAppAccessPermission: vi.fn(),
  requireOrgAppAccessRead: vi.fn(),
}))
const repository = vi.hoisted(() => ({
  findAssignmentForUserApp: vi.fn(),
  listPermissions: vi.fn(),
}))

vi.mock('@/modules/modules', () => modules)
vi.mock('@/modules/apps', () => apps)
vi.mock('@/modules/memberships', () => memberships)
vi.mock('@/modules/organizations', () => organizations)
vi.mock('../app-access.repository', () => repository)

import { retrieveMyAppRuntimeMembership } from '../app-access.service'

describe('retrieveMyAppRuntimeMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apps.findAppForAccessById.mockResolvedValue({
      id: 'app_projects',
      slug: '876-projects',
      name: '876 Projects',
    })
    memberships.findMembershipForAccess.mockResolvedValue({
      id: 'membership_1',
      organization_id: 'org_1',
      user_id: 'user_1',
      status: 'active',
      role: 'member',
    })
    organizations.getOrgAppEntitlement.mockResolvedValue({ status: 'active' })
    repository.findAssignmentForUserApp.mockResolvedValue({
      id: 'assignment_1',
      organizationId: 'org_1',
      userId: 'user_1',
      appId: 'app_projects',
      appRoleId: null,
      status: 'active',
      permissionGrants: ['projects.view'],
      permissionDenies: [],
      title: null,
      attributes: null,
      assignedBy: null,
      assignedAt: null,
      lastAccessAt: null,
      revokedAt: null,
      revokedBy: null,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      createdAt: 1n,
      updatedAt: 1n,
      appRole: null,
    })
    repository.listPermissions.mockResolvedValue([{ key: 'projects.view' }])
    modules.listEntitledModules.mockResolvedValue({
      object: 'list',
      data: [{ key: 'projects' }, { key: 'issues' }],
      has_more: false,
      url: '/modules/entitlements',
    })
  })

  it('adds entitled module keys to the acting member profile', async () => {
    const result = await retrieveMyAppRuntimeMembership(
      'org_1',
      'app_projects',
      { internal: false, userId: 'user_1' }
    )

    expect(result.entitled_modules).toEqual(['projects', 'issues'])
    expect(modules.listEntitledModules).toHaveBeenCalledWith({
      organizationId: 'org_1',
      appId: 'app_projects',
    })
  })

  it('does not query module entitlements when the app itself is not entitled', async () => {
    organizations.getOrgAppEntitlement.mockResolvedValue({ status: 'canceled' })

    const result = await retrieveMyAppRuntimeMembership(
      'org_1',
      'app_projects',
      { internal: false, userId: 'user_1' }
    )

    expect(result.entitled_modules).toEqual([])
    expect(modules.listEntitledModules).not.toHaveBeenCalled()
  })

  it('preserves effective permissions while adding module entitlements', async () => {
    const result = await retrieveMyAppRuntimeMembership(
      'org_1',
      'app_projects',
      { internal: false, userId: 'user_1' }
    )

    expect(result.effective_permissions).toEqual(['projects.view'])
    expect(result.assigned).toBe(true)
    expect(result.entitled).toBe(true)
  })
})
