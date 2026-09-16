import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { followerListSchema, followerSchema, unfollowResultSchema } from '../types'
import { createFollowersResource } from './followers'

describe('followers resource', () => {
  const resource = createFollowersResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists followers for a subject', async () => {
    await resource.list('org 1', {
      subjectType: 'project',
      subjectId: 'prj_1',
      limit: 10,
      startingAfter: 'flw_1',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/followers?subjectType=project&subjectId=prj_1&limit=10&starting_after=flw_1',
        signal: undefined,
      },
      followerListSchema
    )
  })

  it('follows a subject', async () => {
    await resource.follow('org 1', {
      subjectType: 'work-item',
      subjectId: 'iss_1',
      userId: 'usr_1',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/followers',
        body: { subjectType: 'work-item', subjectId: 'iss_1', userId: 'usr_1' },
        signal: undefined,
      },
      followerSchema
    )
  })

  it('unfollows via query string', async () => {
    await resource.unfollow('org 1', {
      subjectType: 'project',
      subjectId: 'prj_1',
      userId: 'usr_1',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/followers?subjectType=project&subjectId=prj_1&userId=usr_1',
        signal: undefined,
      },
      unfollowResultSchema
    )
  })
})
