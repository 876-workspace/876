import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetManageContext, mockGetCouriers, mockGetPlatform } = vi.hoisted(
  () => ({
    mockGetManageContext: vi.fn(),
    mockGetCouriers: vi.fn(),
    mockGetPlatform: vi.fn(),
  })
)

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mockGetManageContext,
}))

vi.mock('@/lib/clients/couriers', () => ({
  getCouriers: mockGetCouriers,
}))

vi.mock('@/lib/clients/platform', () => ({
  getPlatformClient: mockGetPlatform,
}))

vi.mock('@/lib/couriers', () => ({
  requireCouriersData: <T>(result: { data: T }) => result.data,
  toTeamMemberView: (member: Record<string, unknown>) => ({
    id: member['id'],
    userId: member['user_id'],
    roleId: member['role_id'],
    roleName: member['role_name'],
    roleSystemKey: member['role_system_key'],
    status: member['status'],
    createdAt: member['created_at'],
  }),
  toRoleView: (role: Record<string, unknown>) => ({
    id: role['id'],
    name: role['name'],
    permissions: role['permissions'],
    systemKey: role['system_key'],
  }),
}))

import { listInviteRoleOptions, listTeamData } from './team-members'

const membershipsList = vi.fn()
const rolesList = vi.fn()
const invitesList = vi.fn()
const usersRetrieve = vi.fn()

const member = {
  id: 'tmem_alejandra',
  user_id: 'usr_alejandra',
  role_id: 'role_admin',
  role_name: 'Admin',
  role_system_key: 'admin',
  status: 'active',
  created_at: 1_784_419_200,
  updated_at: 1_784_419_200,
}

describe('listTeamData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetManageContext.mockResolvedValue({
      tenant: { id: 'ten_island' },
      orgId: 'org_island',
    })
    membershipsList.mockResolvedValue({ data: { data: [member] } })
    rolesList.mockResolvedValue({
      data: {
        data: [
          {
            id: 'role_admin',
            name: 'Admin',
            permissions: ['items.view'],
            system_key: 'admin',
          },
        ],
      },
    })
    invitesList.mockResolvedValue({
      data: {
        data: [
          {
            id: 'inv_pending',
            email: 'pending@example.com',
            role: 'staff',
            status: 'pending',
            expires_at: 1_784_505_600,
          },
          {
            id: 'inv_accepted',
            email: 'accepted@example.com',
            role: 'staff',
            status: 'accepted',
            expires_at: 1_784_505_600,
          },
        ],
      },
    })
    usersRetrieve.mockResolvedValue({
      data: {
        first_name: 'Alejandra',
        last_name: 'Reyes',
        email: 'alejandra@example.com',
        avatar: null,
      },
      error: null,
    })
    mockGetCouriers.mockResolvedValue({
      memberships: { list: membershipsList },
      roles: { list: rolesList },
    })
    mockGetPlatform.mockResolvedValue({
      invites: { list: invitesList },
      users: { retrieve: usersRetrieve },
    })
  })

  it('builds member rows with resolved names, roles, and pending invites only', async () => {
    const data = await listTeamData('island-logistics')

    expect(data?.rows).toEqual([
      {
        id: 'tmem_alejandra',
        userId: 'usr_alejandra',
        name: 'Alejandra Reyes',
        email: 'alejandra@example.com',
        avatar: null,
        roleId: 'role_admin',
        roleName: 'Admin',
        roleSystemKey: 'admin',
        status: 'active',
        createdAt: 1_784_419_200,
      },
    ])
    expect(data?.roles).toEqual([
      {
        id: 'role_admin',
        name: 'Admin',
        permissions: ['items.view'],
        systemKey: 'admin',
      },
    ])
    expect(data?.pendingInvites).toEqual([
      {
        id: 'inv_pending',
        email: 'pending@example.com',
        role: 'staff',
        expiresAt: 1_784_505_600,
      },
    ])
  })

  it('fetches the unfiltered member list for client-side filtering', async () => {
    await listTeamData('montego-bay')

    expect(membershipsList).toHaveBeenCalledWith({ status: undefined })
  })

  it('falls back to the email and then the user id when the identity is missing', async () => {
    usersRetrieve.mockResolvedValue({
      data: null,
      error: { code: 'identity/not-found', message: 'Missing.' },
    })
    usersRetrieve
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'identity/not-found', message: 'Missing.' },
      })
      .mockResolvedValueOnce({
        data: {
          first_name: null,
          last_name: null,
          email: 'malik@example.com',
          avatar: null,
        },
        error: null,
      })
    membershipsList.mockResolvedValue({
      data: {
        data: [
          member,
          { ...member, id: 'tmem_malik', user_id: 'usr_malik' },
          { ...member, id: 'tmem_anon', user_id: 'usr_anon' },
        ],
      },
    })

    const data = await listTeamData('negril')

    expect(data?.rows.map((row) => row.name)).toEqual([
      'usr_alejandra',
      'malik@example.com',
      'usr_anon',
    ])
  })

  it('returns null without fetching when there is no tenant', async () => {
    mockGetManageContext.mockResolvedValue(null)

    const data = await listTeamData('ocho-rios')

    expect(data).toBeNull()
    expect(membershipsList).not.toHaveBeenCalled()
  })
})

describe('listInviteRoleOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetManageContext.mockResolvedValue({ tenant: { id: 'ten_island' } })
    rolesList.mockResolvedValue({
      data: {
        data: [
          {
            id: 'role_admin',
            name: 'Admin',
            permissions: [],
            system_key: 'admin',
          },
        ],
      },
    })
    mockGetCouriers.mockResolvedValue({ roles: { list: rolesList } })
  })

  it('returns id and name pairs for the invite dialog', async () => {
    await expect(listInviteRoleOptions('port-antonio')).resolves.toEqual([
      { id: 'role_admin', name: 'Admin' },
    ])
  })

  it('returns an empty list without a tenant', async () => {
    mockGetManageContext.mockResolvedValue(null)

    await expect(listInviteRoleOptions('treasure-beach')).resolves.toEqual([])
    expect(rolesList).not.toHaveBeenCalled()
  })
})
