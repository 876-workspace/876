import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { workItemTypeListSchema, workItemTypeSchema } from '../types'
import { createWorkItemTypesResource } from './work-item-types'

describe('work item types resource', () => {
  const resource = createWorkItemTypesResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('uses the work item type endpoints and schemas', async () => {
    const input = { key: 'bug', name: 'Bug', iconKey: 'bug', color: '#dc2626' }
    await resource.list('org 1')
    await resource.create('org 1', input)
    await resource.retrieve('org 1', 'wit/1')
    await resource.update('org 1', 'wit/1', { name: 'Defect' })
    await resource.delete('org 1', 'wit/1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/work-item-types',
        signal: undefined,
      },
      workItemTypeListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/work-item-types',
        body: input,
        signal: undefined,
      },
      workItemTypeSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/work-item-types/wit%2F1',
        signal: undefined,
      },
      workItemTypeSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/work-item-types/wit%2F1',
        body: { name: 'Defect' },
        signal: undefined,
      },
      workItemTypeSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      5,
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/work-item-types/wit%2F1',
        signal: undefined,
      },
      workItemTypeSchema
    )
  })

  it('passes request errors through unchanged', async () => {
    const error = { code: 'projects/tenant-not-found', message: 'Missing.' }
    requestMock.mockResolvedValueOnce({ data: null, error })
    await expect(resource.list('org_1')).resolves.toEqual({ data: null, error })
  })
})
