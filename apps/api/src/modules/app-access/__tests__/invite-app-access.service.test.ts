import { beforeEach, describe, expect, it, vi } from 'vitest'

const organizations = vi.hoisted(() => ({
  findOrgRoleForInvite: vi.fn(),
  getOrgAppEntitlement: vi.fn(),
  findInviteAccessSelectionById: vi.fn(),
  findInviteAccessSelectionByToken: vi.fn(),
  updateInviteAccessSelection: vi.fn(),
}))
const appAccess = vi.hoisted(() => ({
  findOrgAppRoleForAccess: vi.fn(),
  ensureAppMembershipForProvisioning: vi.fn(),
}))

vi.mock('@/modules/organizations', () => organizations)
vi.mock('../app-access-lookup.service', () => ({
  findOrgAppRoleForAccess: appAccess.findOrgAppRoleForAccess,
}))
vi.mock('../app-access-provisioning.service', () => ({
  ensureAppMembershipForProvisioning:
    appAccess.ensureAppMembershipForProvisioning,
}))

const {
  applyInviteAppAccess,
  resolveInviteAppAccessSelection,
  validateInviteAppAccessSelection,
} = await import('../invite-app-access.service')

const ORG = 'org_kingstonlabs'
const APP = 'rap_crm876'

beforeEach(() => {
  vi.clearAllMocks()
  organizations.findOrgRoleForInvite.mockResolvedValue({
    id: 'orl_manager',
    name: 'Manager',
  })
  organizations.getOrgAppEntitlement.mockResolvedValue({ status: 'active' })
  appAccess.findOrgAppRoleForAccess.mockResolvedValue({ id: 'rol_agent' })
})

describe('validateInviteAppAccessSelection', () => {
  it('returns the validated selection for an entitled source app', async () => {
    const result = await validateInviteAppAccessSelection({
      organizationId: ORG,
      sourceAppId: APP,
      appRoleId: 'rol_agent',
      orgRoleId: 'orl_manager',
    })

    expect(result).toEqual({
      sourceAppId: APP,
      appRoleId: 'rol_agent',
      orgRoleId: 'orl_manager',
      orgRoleName: 'Manager',
    })
    expect(organizations.getOrgAppEntitlement).toHaveBeenCalledWith(ORG, APP)
    expect(appAccess.findOrgAppRoleForAccess).toHaveBeenCalledWith({
      appId: APP,
      organizationId: ORG,
      roleId: 'rol_agent',
    })
  })

  it('accepts an invite with no role selection at all', async () => {
    const result = await validateInviteAppAccessSelection({
      organizationId: ORG,
    })

    expect(result).toEqual({
      sourceAppId: null,
      appRoleId: null,
      orgRoleId: null,
      orgRoleName: null,
    })
    expect(organizations.getOrgAppEntitlement).not.toHaveBeenCalled()
    expect(appAccess.findOrgAppRoleForAccess).not.toHaveBeenCalled()
  })

  it('rejects an organization role that does not belong to the organization', async () => {
    organizations.findOrgRoleForInvite.mockResolvedValue(null)

    await expect(
      validateInviteAppAccessSelection({
        organizationId: ORG,
        orgRoleId: 'orl_other_org',
      })
    ).rejects.toMatchObject({ code: 'role/not-found', httpStatus: 404 })
    expect(organizations.getOrgAppEntitlement).not.toHaveBeenCalled()
  })

  it('rejects an app role selected without a source app', async () => {
    await expect(
      validateInviteAppAccessSelection({
        organizationId: ORG,
        appRoleId: 'rol_agent',
      })
    ).rejects.toMatchObject({ code: 'invite/app-required', httpStatus: 400 })
    expect(appAccess.findOrgAppRoleForAccess).not.toHaveBeenCalled()
  })

  it.each([
    ['missing entitlement', null],
    ['cancelled entitlement', { status: 'cancelled' }],
    ['past-due entitlement', { status: 'past_due' }],
  ])('fails closed for %s', async (_label, entitlement) => {
    organizations.getOrgAppEntitlement.mockResolvedValue(entitlement)

    await expect(
      validateInviteAppAccessSelection({
        organizationId: ORG,
        sourceAppId: APP,
        appRoleId: 'rol_agent',
      })
    ).rejects.toMatchObject({ code: 'app-membership/not-entitled' })
    expect(appAccess.findOrgAppRoleForAccess).not.toHaveBeenCalled()
  })

  it('accepts a trialing entitlement', async () => {
    organizations.getOrgAppEntitlement.mockResolvedValue({ status: 'trialing' })

    const result = await validateInviteAppAccessSelection({
      organizationId: ORG,
      sourceAppId: APP,
      appRoleId: 'rol_agent',
    })

    expect(result.appRoleId).toBe('rol_agent')
  })

  it('rejects an app role that no longer exists for the organization', async () => {
    appAccess.findOrgAppRoleForAccess.mockResolvedValue(null)

    await expect(
      validateInviteAppAccessSelection({
        organizationId: ORG,
        sourceAppId: APP,
        appRoleId: 'rol_deleted',
      })
    ).rejects.toMatchObject({ code: 'app-role/not-found' })
  })
})

describe('resolveInviteAppAccessSelection', () => {
  it('revalidates the persisted selection at acceptance time', async () => {
    organizations.findInviteAccessSelectionByToken.mockResolvedValue({
      id: 'inv_01',
      organizationId: ORG,
      sourceAppId: APP,
      appRoleId: 'rol_agent',
      orgRoleId: null,
    })

    const result = await resolveInviteAppAccessSelection('tok_abc')

    expect(result.appRoleId).toBe('rol_agent')
    expect(organizations.getOrgAppEntitlement).toHaveBeenCalledWith(ORG, APP)
  })

  it('fails closed when the entitlement lapsed after the invite was sent', async () => {
    organizations.findInviteAccessSelectionByToken.mockResolvedValue({
      id: 'inv_01',
      organizationId: ORG,
      sourceAppId: APP,
      appRoleId: 'rol_agent',
      orgRoleId: null,
    })
    organizations.getOrgAppEntitlement.mockResolvedValue({
      status: 'cancelled',
    })

    await expect(
      resolveInviteAppAccessSelection('tok_abc')
    ).rejects.toMatchObject({
      code: 'app-membership/not-entitled',
    })
  })

  it('404s for an unknown invite token', async () => {
    organizations.findInviteAccessSelectionByToken.mockResolvedValue(null)

    await expect(
      resolveInviteAppAccessSelection('tok_missing')
    ).rejects.toMatchObject({
      code: 'invite/not-found',
      httpStatus: 404,
    })
  })
})

describe('applyInviteAppAccess', () => {
  it('is a no-op for an invite with no source app', async () => {
    const result = await applyInviteAppAccess({
      organizationId: ORG,
      userId: 'user_01',
    })

    expect(result).toBeNull()
    expect(appAccess.ensureAppMembershipForProvisioning).not.toHaveBeenCalled()
  })

  it('provisions the app membership with the selected role', async () => {
    appAccess.ensureAppMembershipForProvisioning.mockResolvedValue({
      id: 'apa_01',
    })

    const result = await applyInviteAppAccess({
      organizationId: ORG,
      userId: 'user_01',
      sourceAppId: APP,
      appRoleId: 'rol_agent',
      actorUserId: 'user_admin',
    })

    expect(result).toEqual({ id: 'apa_01' })
    expect(appAccess.ensureAppMembershipForProvisioning).toHaveBeenCalledTimes(
      1
    )
    expect(appAccess.ensureAppMembershipForProvisioning).toHaveBeenCalledWith({
      organizationId: ORG,
      userId: 'user_01',
      appId: APP,
      appRoleId: 'rol_agent',
      actorUserId: 'user_admin',
    })
  })

  it('routes an unselected invite through canonical automatic role resolution', async () => {
    appAccess.ensureAppMembershipForProvisioning.mockResolvedValue({
      id: 'apa_02',
    })

    const result = await applyInviteAppAccess({
      organizationId: ORG,
      userId: 'user_02',
      sourceAppId: APP,
      actorUserId: 'user_admin',
    })

    expect(result).toEqual({ id: 'apa_02' })
    expect(appAccess.ensureAppMembershipForProvisioning).toHaveBeenCalledTimes(
      1
    )
    expect(appAccess.ensureAppMembershipForProvisioning).toHaveBeenCalledWith({
      organizationId: ORG,
      userId: 'user_02',
      appId: APP,
      appRoleId: null,
      actorUserId: 'user_admin',
    })
  })
})
