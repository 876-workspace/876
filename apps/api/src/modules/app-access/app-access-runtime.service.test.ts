import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppMembership } from './app-access.schemas'

const appAccess = vi.hoisted(() => ({
  retrieveMyAppMembership: vi.fn(),
}))
const modules = vi.hoisted(() => ({
  listEntitledModules: vi.fn(),
}))

vi.mock('./app-access.service', () => appAccess)
vi.mock('@/modules/modules', () => modules)

import { retrieveMyAppRuntimeMembership } from './app-access-runtime.service'

function membership(overrides: Partial<AppMembership> = {}): AppMembership {
  return {
    object: 'app_membership',
    id: 'assignment_1',
    organization_id: 'org_1',
    user_id: 'user_1',
    membership_id: 'membership_1',
    app_id: 'app_projects',
    app_slug: '876-projects',
    app_name: '876 Projects',
    status: 'active',
    assigned: true,
    entitled: true,
    app_role: null,
    permission_grants: [],
    permission_denies: [],
    effective_permissions: ['projects.view'],
    title: null,
    attributes: null,
    assigned_by: null,
    assigned_at: null,
    last_access_at: null,
    revoked_at: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

describe('retrieveMyAppRuntimeMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appAccess.retrieveMyAppMembership.mockResolvedValue(membership())
    modules.listEntitledModules.mockResolvedValue({
      object: 'list',
      data: [
        { key: 'projects' },
        { key: 'issues' },
      ],
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
    appAccess.retrieveMyAppMembership.mockResolvedValue(
      membership({ entitled: false, effective_permissions: [] })
    )

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
