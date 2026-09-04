import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { deletedSchema, milestoneListSchema, milestoneSchema } from '../types'
import { createMilestonesResource } from './milestones'

describe('milestones resource', () => {
  const resource = createMilestonesResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('uses the milestone endpoints, query string, and schemas', async () => {
    const input = { projectId: 'prj_1', key: 'v1', name: 'Version 1' }
    await resource.list('org 1', 'prj/1', { status: 'open' })
    await resource.create('org 1', input)
    await resource.retrieve('org 1', 'ms/1')
    await resource.update('org 1', 'ms/1', { status: 'completed' })
    await resource.delete('org 1', 'ms/1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/milestones?projectId=prj%2F1&status=open',
        signal: undefined,
      },
      milestoneListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/milestones',
        body: input,
        signal: undefined,
      },
      milestoneSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/milestones/ms%2F1',
        signal: undefined,
      },
      milestoneSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/milestones/ms%2F1',
        body: { status: 'completed' },
        signal: undefined,
      },
      milestoneSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      5,
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/milestones/ms%2F1',
        signal: undefined,
      },
      deletedSchema
    )
  })

  it('passes request errors through unchanged', async () => {
    const error = { code: 'projects/project-not-found', message: 'Missing.' }
    requestMock.mockResolvedValueOnce({ data: null, error })
    await expect(resource.list('org_1', 'prj_1')).resolves.toEqual({
      data: null,
      error,
    })
  })
})
