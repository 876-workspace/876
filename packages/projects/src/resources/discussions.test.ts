import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  deletedSchema,
  discussionListSchema,
  discussionPostListSchema,
  discussionPostSchema,
  discussionSchema,
  visibilityResultSchema,
} from '../types'
import { createDiscussionsResource } from './discussions'

describe('discussions resource', () => {
  const resource = createDiscussionsResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists discussions for a project', async () => {
    await resource.list('org_1', 'prj_1', { limit: 10 })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/projects/prj_1/discussions?limit=10',
        signal: undefined,
      },
      discussionListSchema
    )
  })

  it('creates a discussion', async () => {
    await resource.create('org_1', 'prj_1', {
      title: 'Kickoff',
      body: 'Welcome',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org_1/projects/prj_1/discussions',
        body: { title: 'Kickoff', body: 'Welcome' },
        signal: undefined,
      },
      discussionSchema
    )
  })

  it('updates a post by id', async () => {
    await resource.updatePost('org_1', 'prj_1', 'dsc_1', 'dpt_1', {
      body: 'Edited',
      authorUserId: 'usr_1',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org_1/projects/prj_1/discussions/dsc_1/posts/dpt_1',
        body: { body: 'Edited', authorUserId: 'usr_1' },
        signal: undefined,
      },
      discussionPostSchema
    )
  })

  it('sets client visibility', async () => {
    await resource.setClientVisibility('org_1', 'prj_1', 'dsc_1', true)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org_1/projects/prj_1/discussions/dsc_1/client-visibility',
        body: { clientVisible: true },
        signal: undefined,
      },
      visibilityResultSchema
    )
  })

  it('lists posts and deletes discussions', async () => {
    await resource.listPosts('org_1', 'prj_1', 'dsc_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/projects/prj_1/discussions/dsc_1/posts',
        signal: undefined,
      },
      discussionPostListSchema
    )

    await resource.delete('org_1', 'prj_1', 'dsc_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org_1/projects/prj_1/discussions/dsc_1',
        signal: undefined,
      },
      deletedSchema
    )
  })
})
