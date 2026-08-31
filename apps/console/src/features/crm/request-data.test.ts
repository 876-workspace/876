import { beforeEach, describe, expect, it, vi } from 'vitest'

const { platformOrg, guards, client } = vi.hoisted(() => ({
  platformOrg: { getPlatformOrganization: vi.fn() },
  guards: { requireSession: vi.fn() },
  client: {
    departments: { list: vi.fn() },
    members: { list: vi.fn() },
  },
}))

vi.mock('@/lib/platform-org', () => platformOrg)
vi.mock('@/lib/auth/guards', () => guards)
vi.mock('@/lib/services/workspace', () => ({ workspace: client }))

const ORG = { id: 'org_fa2cfb0b', slug: 'efesto' }

const MEMBER = {
  user_id: 'user_695d45c5',
  first_name: 'Alejandra',
  last_name: 'Reyes',
  email: 'alejandra@example.com',
  avatar: 'https://workoscdn.com/images/v1/VjVHK1itr4ddPqNYA2X99',
}

async function loadDirectory() {
  vi.resetModules()
  const mod = await import('./request-data')
  return mod.loadDirectory()
}

describe('loadDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platformOrg.getPlatformOrganization.mockResolvedValue(ORG)
    guards.requireSession.mockResolvedValue({ id: 'user_695d45c5' })
    client.departments.list.mockResolvedValue({
      data: { data: [{ id: 'team_1', name: 'Support' }] },
      error: null,
    })
    client.members.list.mockResolvedValue({
      data: { data: [MEMBER], has_more: false },
      error: null,
    })
  })

  it('reads members through the workspace operator client', async () => {
    await loadDirectory()

    expect(client.members.list).toHaveBeenCalledTimes(1)
    expect(client.members.list).toHaveBeenCalledWith(ORG.id, {
      limit: 100,
    })
  })

  it('reads departments through the workspace operator client', async () => {
    await loadDirectory()

    expect(client.departments.list).toHaveBeenCalledTimes(1)
    expect(client.departments.list).toHaveBeenCalledWith(ORG.id)
  })

  it('carries the avatar through so a note can picture its author', async () => {
    const { members } = await loadDirectory()

    expect(members).toEqual([
      {
        userId: MEMBER.user_id,
        name: 'Alejandra Reyes',
        email: MEMBER.email,
        avatar: MEMBER.avatar,
      },
    ])
  })

  it('falls back to the email when a member has no name', async () => {
    client.members.list.mockResolvedValue({
      data: { data: [{ ...MEMBER, first_name: null, last_name: null }] },
      error: null,
    })

    const { members } = await loadDirectory()

    expect(members[0].name).toBe(MEMBER.email)
  })

  it('falls back to the user id when a member has neither name nor email', async () => {
    client.members.list.mockResolvedValue({
      data: {
        data: [{ ...MEMBER, first_name: null, last_name: null, email: null }],
      },
      error: null,
    })

    const { members } = await loadDirectory()

    expect(members[0].name).toBe(MEMBER.user_id)
  })

  it('returns an empty directory when the platform org is unresolvable', async () => {
    platformOrg.getPlatformOrganization.mockResolvedValue(null)

    const result = await loadDirectory()

    expect(result).toEqual({
      departments: [],
      departmentsError: null,
      members: [],
      membersError: null,
    })
    expect(client.members.list).not.toHaveBeenCalled()
  })
})
