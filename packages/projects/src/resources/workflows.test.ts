import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { workflowBlueprintSchema } from '../types'
import { createWorkflowsResource } from './workflows'

describe('workflows resource', () => {
  const resource = createWorkflowsResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('fetches blueprints by type', async () => {
    await resource.getBlueprint('org 1', 'wit/1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/workflows/wit%2F1/blueprint',
        signal: undefined,
      },
      workflowBlueprintSchema
    )
  })

  it('replaces blueprints by type', async () => {
    const input = {
      transitions: [
        { fromStateKey: 'todo', toStateKey: 'done', name: 'Ship' },
      ],
    }
    await resource.putBlueprint('org 1', 'wit/1', input)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'PUT',
        path: '/v1/organizations/org%201/workflows/wit%2F1/blueprint',
        body: input,
        signal: undefined,
      },
      workflowBlueprintSchema
    )
  })
})
