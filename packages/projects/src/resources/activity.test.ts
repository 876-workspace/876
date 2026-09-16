import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { activityFeedSchema } from '../types'
import { createActivityResource } from './activity'

describe('activity resource', () => {
  const resource = createActivityResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists project activity with cursor pagination', async () => {
    await resource.listProjectActivity('org 1', 'prj 1', {
      limit: 25,
      cursor: '1787767200:evt_1',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj%201/activity?limit=25&cursor=1787767200%3Aevt_1',
        signal: undefined,
      },
      activityFeedSchema
    )
  })

  it('omits the query string when no params are given', async () => {
    await resource.listProjectActivity('org_1', 'prj_1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/projects/prj_1/activity',
        signal: undefined,
      },
      activityFeedSchema
    )
  })
})
