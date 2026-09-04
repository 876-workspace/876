import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { workflowStateListSchema, workflowStateSchema } from '../types'
import { createWorkflowStatesResource } from './workflow-states'

describe('workflow states resource', () => {
  const resource = createWorkflowStatesResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('uses the workflow state endpoints and schemas', async () => {
    const input = {
      key: 'todo',
      name: 'To do',
      category: 'unstarted' as const,
      color: '#64748b',
    }
    await resource.list('org 1')
    await resource.create('org 1', input)
    await resource.retrieve('org 1', 'wfs/1')
    await resource.update('org 1', 'wfs/1', { category: 'started' })
    await resource.delete('org 1', 'wfs/1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/workflow-states',
        signal: undefined,
      },
      workflowStateListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/workflow-states',
        body: input,
        signal: undefined,
      },
      workflowStateSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/workflow-states/wfs%2F1',
        signal: undefined,
      },
      workflowStateSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/workflow-states/wfs%2F1',
        body: { category: 'started' },
        signal: undefined,
      },
      workflowStateSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      5,
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/workflow-states/wfs%2F1',
        signal: undefined,
      },
      workflowStateSchema
    )
  })

  it('passes request errors through unchanged', async () => {
    const error = { code: 'projects/tenant-not-found', message: 'Missing.' }
    requestMock.mockResolvedValueOnce({ data: null, error })
    await expect(resource.list('org_1')).resolves.toEqual({ data: null, error })
  })
})
