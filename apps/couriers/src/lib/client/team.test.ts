import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('./request', () => ({
  request: mocks.request,
}))

import { team } from './team'

describe('client.team', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: { id: 'tmem_1' }, error: null })
  })

  it('updates members with orgSlug in the body and encodes ids in the path', async () => {
    await team.update('island-logistics', 'tmem/a b', {
      status: 'inactive',
      roleId: 'role_staff',
    })

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/manage/team/tmem%2Fa%20b',
      {
        method: 'PATCH',
        body: JSON.stringify({
          orgSlug: 'island-logistics',
          status: 'inactive',
          roleId: 'role_staff',
        }),
      }
    )
  })

  it('creates invites with email + tenant roleId for the platform bridge', async () => {
    await team.invites.create('island-logistics', {
      email: 'alejandra@example.com',
      roleId: 'role_admin',
    })

    expect(mocks.request).toHaveBeenCalledWith('/api/manage/team/invites', {
      method: 'POST',
      body: JSON.stringify({
        orgSlug: 'island-logistics',
        email: 'alejandra@example.com',
        roleId: 'role_admin',
      }),
    })
  })

  it('revokes invites with encoded invite ids and orgSlug query', async () => {
    await team.invites.revoke('island-logistics', 'invite/a b')

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/manage/team/invites/invite%2Fa%20b?orgSlug=island-logistics',
      { method: 'DELETE' }
    )
  })
})
