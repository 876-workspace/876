import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('./request', () => ({
  request: mocks.request,
}))

import { roles } from './roles'

describe('client.roles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: { id: 'role_1' }, error: null })
  })

  it('creates roles against POST /api/manage/roles with orgSlug in the body', async () => {
    await roles.create('island-logistics', {
      name: 'Dispatcher',
      permissions: ['packages.view'],
    })

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/manage/roles', {
      method: 'POST',
      body: JSON.stringify({
        orgSlug: 'island-logistics',
        name: 'Dispatcher',
        permissions: ['packages.view'],
      }),
    })
  })

  it('updates and deletes with encoded role ids so reserved path chars stay intact', async () => {
    await roles.update('island-logistics', 'role/a b', {
      name: 'Dispatch',
    })
    await roles.delete('island-logistics', 'role/a b')

    expect(mocks.request).toHaveBeenNthCalledWith(
      1,
      '/api/manage/roles/role%2Fa%20b',
      {
        method: 'PATCH',
        body: JSON.stringify({
          orgSlug: 'island-logistics',
          name: 'Dispatch',
        }),
      }
    )
    expect(mocks.request).toHaveBeenNthCalledWith(
      2,
      '/api/manage/roles/role%2Fa%20b?orgSlug=island-logistics',
      { method: 'DELETE' }
    )
  })
})
