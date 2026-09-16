import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { myWorkSchema } from '../types'
import { createMyWorkResource } from './my-work'

describe('my-work resource', () => {
  const resource = createMyWorkResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('retrieves my work for a user', async () => {
    await resource.retrieve('org 1', 'usr_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/my-work?userId=usr_1',
        signal: undefined,
      },
      myWorkSchema
    )
  })

  it('encodes user ids in the my-work path', async () => {
    await resource.retrieve('org 1', 'usr 2')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/v1/organizations/org%201/my-work?userId=usr+2',
      }),
      myWorkSchema
    )
  })
})
