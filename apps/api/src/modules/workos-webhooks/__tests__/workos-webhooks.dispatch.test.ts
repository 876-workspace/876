import { beforeEach, describe, expect, it, vi } from 'vitest'

const { users, organizations, memberships } = vi.hoisted(() => ({
  users: { syncUserFromWorkos: vi.fn(), findLocalUserIdByWorkosId: vi.fn() },
  organizations: {
    syncOrganizationFromWorkos: vi.fn(),
    findLocalOrgIdByWorkosId: vi.fn(),
  },
  memberships: {
    upsertMembershipFromWorkos: vi.fn(),
    removeMembershipByWorkosId: vi.fn(),
  },
}))

vi.mock('@/modules/users', () => users)
vi.mock('@/modules/organizations', () => organizations)
vi.mock('@/modules/memberships', () => memberships)
vi.mock('@/platform/logger', () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

const { dispatch } = await import('../workos-webhooks.service')

function event(name: string, data: Record<string, unknown>) {
  return { id: 'event_1', event: name, data }
}

describe('workos-webhooks dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies user.updated to the local user', async () => {
    users.syncUserFromWorkos.mockResolvedValue(true)

    const result = await dispatch(
      event('user.updated', {
        id: 'user_1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.test',
      })
    )

    expect(result).toEqual({ applied: true })
    expect(users.syncUserFromWorkos).toHaveBeenCalledTimes(1)
    expect(users.syncUserFromWorkos).toHaveBeenCalledWith({
      workosUserId: 'user_1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
    })
  })

  it('applies organization.updated to the local org', async () => {
    organizations.syncOrganizationFromWorkos.mockResolvedValue(true)

    const result = await dispatch(
      event('organization.updated', { id: 'org_1', name: 'Acme Renamed' })
    )

    expect(result).toEqual({ applied: true })
    expect(organizations.syncOrganizationFromWorkos).toHaveBeenCalledWith({
      workosOrganizationId: 'org_1',
      name: 'Acme Renamed',
    })
    expect(memberships.upsertMembershipFromWorkos).not.toHaveBeenCalled()
  })

  it('upserts a membership, resolving local org and user ids and the role slug', async () => {
    organizations.findLocalOrgIdByWorkosId.mockResolvedValue('local_org_1')
    users.findLocalUserIdByWorkosId.mockResolvedValue('local_user_1')
    memberships.upsertMembershipFromWorkos.mockResolvedValue('updated')

    const result = await dispatch(
      event('organization_membership.updated', {
        id: 'om_1',
        organization_id: 'org_workos_1',
        user_id: 'user_workos_1',
        role: { slug: 'admin' },
        status: 'active',
      })
    )

    expect(result).toEqual({ applied: true })
    expect(organizations.findLocalOrgIdByWorkosId).toHaveBeenCalledWith(
      'org_workos_1'
    )
    expect(users.findLocalUserIdByWorkosId).toHaveBeenCalledWith(
      'user_workos_1'
    )
    expect(memberships.upsertMembershipFromWorkos).toHaveBeenCalledWith({
      workosMembershipId: 'om_1',
      organizationId: 'local_org_1',
      userId: 'local_user_1',
      role: 'admin',
      status: 'active',
    })
  })

  it('reports not-applied when a membership cannot be resolved to create', async () => {
    organizations.findLocalOrgIdByWorkosId.mockResolvedValue(null)
    users.findLocalUserIdByWorkosId.mockResolvedValue(null)
    memberships.upsertMembershipFromWorkos.mockResolvedValue('skipped')

    const result = await dispatch(
      event('organization_membership.created', {
        id: 'om_2',
        organization_id: 'org_workos_2',
        user_id: 'user_workos_2',
        role: 'staff',
        status: 'active',
      })
    )

    expect(result).toEqual({ applied: false })
    expect(memberships.upsertMembershipFromWorkos).toHaveBeenCalledWith({
      workosMembershipId: 'om_2',
      organizationId: null,
      userId: null,
      role: 'staff',
      status: 'active',
    })
  })

  it('defaults an unrecognized role shape to staff', async () => {
    organizations.findLocalOrgIdByWorkosId.mockResolvedValue('local_org_1')
    users.findLocalUserIdByWorkosId.mockResolvedValue('local_user_1')
    memberships.upsertMembershipFromWorkos.mockResolvedValue('created')

    await dispatch(
      event('organization_membership.created', {
        id: 'om_3',
        organization_id: 'org_workos_3',
        user_id: 'user_workos_3',
        role: {},
        status: null,
      })
    )

    expect(memberships.upsertMembershipFromWorkos).toHaveBeenCalledWith({
      workosMembershipId: 'om_3',
      organizationId: 'local_org_1',
      userId: 'local_user_1',
      role: 'staff',
      status: 'active',
    })
  })

  it('soft-deletes a membership on organization_membership.deleted', async () => {
    memberships.removeMembershipByWorkosId.mockResolvedValue(true)

    const result = await dispatch(
      event('organization_membership.deleted', { id: 'om_4' })
    )

    expect(result).toEqual({ applied: true })
    expect(memberships.removeMembershipByWorkosId).toHaveBeenCalledWith('om_4')
  })

  it('acknowledges an unknown event without touching any module', async () => {
    const result = await dispatch(
      event('connection.activated', { id: 'conn_1' })
    )

    expect(result).toEqual({ applied: false })
    expect(users.syncUserFromWorkos).not.toHaveBeenCalled()
    expect(organizations.syncOrganizationFromWorkos).not.toHaveBeenCalled()
    expect(memberships.upsertMembershipFromWorkos).not.toHaveBeenCalled()
    expect(memberships.removeMembershipByWorkosId).not.toHaveBeenCalled()
  })
})
