import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  automationRuleListSchema,
  automationRuleSchema,
  automationRunListSchema,
  automationTestSchema,
} from '../types'
import { createAutomationRulesResource } from './automation-rules'

describe('automation-rules resource', () => {
  const resource = createAutomationRulesResource(
    buildRuntime({ internalKey: 'key' })
  )
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists rules', async () => {
    await resource.list('org 1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/automation-rules',
        signal: undefined,
      },
      automationRuleListSchema
    )
  })

  it('creates rules', async () => {
    const input = {
      name: 'R',
      trigger: 'work-item.created' as const,
      actions: [{ type: 'notify' as const, userId: 'u', title: 't' }],
    }
    await resource.create('org 1', input)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/automation-rules',
        body: input,
        signal: undefined,
      },
      automationRuleSchema
    )
  })

  it('retrieves rules by id', async () => {
    await resource.retrieve('org 1', 'arl/1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/automation-rules/arl%2F1',
        signal: undefined,
      },
      automationRuleSchema
    )
  })

  it('updates rules by id', async () => {
    await resource.update('org 1', 'arl/1', { enabled: false })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/automation-rules/arl%2F1',
        body: { enabled: false },
        signal: undefined,
      },
      automationRuleSchema
    )
  })

  it('removes rules by id', async () => {
    await resource.remove('org 1', 'arl/1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/automation-rules/arl%2F1',
        signal: undefined,
      },
      automationRuleSchema
    )
  })

  it('lists runs for a rule', async () => {
    await resource.listRuns('org 1', 'arl/1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/automation-rules/arl%2F1/runs',
        signal: undefined,
      },
      automationRunListSchema
    )
  })

  it('dry-runs rules against a subject', async () => {
    await resource.test('org 1', 'arl/1', { subjectId: 'iss_1' })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/automation-rules/arl%2F1/test',
        body: { subjectId: 'iss_1' },
        signal: undefined,
      },
      automationTestSchema
    )
  })
})
