import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MemberOverview } from './_components/member-overview'
import MemberOverviewPage from './page'

const mocks = vi.hoisted(() => ({
  requireContext: vi.fn(),
  getWorkspace: vi.fn(),
  listEmployees: vi.fn(),
  loadMember: vi.fn(),
  loadUsers: vi.fn(),
  loadMemberships: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/lib/auth/require-projects-context', () => ({
  requireProjectsContext: mocks.requireContext,
}))
vi.mock('@/lib/clients/workspace', () => ({
  getWorkspace: mocks.getWorkspace,
}))
vi.mock('../_data', () => ({
  loadMember: mocks.loadMember,
  loadUsers: mocks.loadUsers,
  loadMemberAppMemberships: mocks.loadMemberships,
}))

const member = {
  object: 'organization_member' as const,
  id: 'mem_1',
  user_id: 'usr_1',
  role: 'member',
  role_id: null,
  position: null,
  status: 'active',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  avatar: null,
  created_at: 1_700_000_000,
}

describe('MemberOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireContext.mockResolvedValue({ orgId: 'org_1' })
    mocks.getWorkspace.mockResolvedValue({
      employees: { list: mocks.listEmployees },
    })
    mocks.loadMember.mockResolvedValue({ member, error: null })
    mocks.loadUsers.mockResolvedValue({ members: [member], error: null })
    mocks.loadMemberships.mockResolvedValue({ memberships: [], error: null })
    mocks.listEmployees.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
  })

  it('loads the organization employee roster exactly once', async () => {
    const element = await MemberOverviewPage({
      params: Promise.resolve({ membershipId: 'mem_1' }),
    })

    expect(element.type).toBe(MemberOverview)
    expect(mocks.listEmployees).toHaveBeenCalledTimes(1)
    expect(mocks.listEmployees).toHaveBeenCalledWith('org_1')
  })

  it('renders the overview without an employee profile', async () => {
    const element = await MemberOverviewPage({
      params: Promise.resolve({ membershipId: 'mem_1' }),
    })

    expect(element).toMatchObject({ props: { profile: null } })
  })

  it('calls notFound only for a successful roster lookup with no member', async () => {
    mocks.loadMember.mockResolvedValue({ member: null, error: null })

    await expect(
      MemberOverviewPage({
        params: Promise.resolve({ membershipId: 'missing' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalledTimes(1)
  })

  it('keeps a roster failure distinct from a missing member', async () => {
    mocks.loadMember.mockResolvedValue({
      member: null,
      error: { code: 'core/unavailable', message: 'Unavailable.' },
    })

    const element = await MemberOverviewPage({
      params: Promise.resolve({ membershipId: 'mem_1' }),
    })

    expect(element.type).not.toBe(MemberOverview)
    expect(mocks.notFound).not.toHaveBeenCalled()
  })
})
