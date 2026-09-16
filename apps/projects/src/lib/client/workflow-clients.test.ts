/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

const { workflowsClient } = await import('./workflows')
const { automationRulesClient } = await import('./automation')
const { notificationsClient } = await import('./notifications')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.request.mockResolvedValue({ data: {}, error: null })
})

describe('workflow browser clients', () => {
  it('fetches a blueprint by work item type', async () => {
    await workflowsClient.getBlueprint('wit_1')

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/workflows/wit_1/blueprint'
    )
  })

  it('saves a blueprint with PUT', async () => {
    const input = {
      transitions: [{ toStateKey: 'done', name: 'Ship' }],
    }
    await workflowsClient.putBlueprint('wit_1', input)

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/workflows/wit_1/blueprint',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }
    )
  })

  it('creates automation rules with POST', async () => {
    const input = {
      name: 'R',
      trigger: 'work-item.created' as const,
      actions: [{ type: 'notify' as const, userId: 'u', title: 't' }],
    }
    await automationRulesClient.create(input)

    expect(mocks.request).toHaveBeenCalledWith('/api/automation-rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  })

  it('toggles a rule with PATCH and deletes it with DELETE', async () => {
    await automationRulesClient.update('arl_1', { enabled: false })

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/automation-rules/arl_1',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      }
    )

    await automationRulesClient.remove('arl_1')

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/automation-rules/arl_1',
      { method: 'DELETE' }
    )
  })

  it('reads runs and dry-runs a rule', async () => {
    await automationRulesClient.listRuns('arl_1')

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/automation-rules/arl_1/runs'
    )

    await automationRulesClient.test('arl_1', { subjectId: 'PROJ-1' })

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/automation-rules/arl_1/test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subjectId: 'PROJ-1' }),
      }
    )
  })

  it('lists the acting user notifications and marks one read', async () => {
    await notificationsClient.list()

    expect(mocks.request).toHaveBeenCalledWith('/api/notifications')

    await notificationsClient.markRead('ntf_1')

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/notifications/ntf_1/read',
      { method: 'POST' }
    )
  })
})
