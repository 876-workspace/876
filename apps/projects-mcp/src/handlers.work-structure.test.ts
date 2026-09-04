import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  config,
  createClient,
  mockMilestone,
  mockWorkflowState,
  mockWorkItemType,
  textOf,
} from './handlers.test-fixtures'
import {
  handleMilestonesList,
  handleWorkflowStatesList,
  handleWorkItemTypesList,
} from './handlers'

describe('work-structure MCP handlers', () => {
  const { client, fetchMock } = createClient()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.restoreAllMocks()
  })

  it('lists active work item types', async () => {
    const listSpy = vi
      .spyOn(client.workItemTypes, 'list')
      .mockResolvedValueOnce({
        data: {
          object: 'list',
          data: [
            mockWorkItemType,
            {
              ...mockWorkItemType,
              id: 'wit_old',
              key: 'legacy',
              name: 'Legacy',
              archivedAt: 1788500000,
            },
          ],
          has_more: false,
          total_count: 2,
          url: '/v1/organizations/org_test_123/work-item-types',
        },
        error: null,
      })

    const result = await handleWorkItemTypesList(client, config, {})
    expect(listSpy).toHaveBeenCalledWith('org_test_123')
    expect(textOf(result)).toContain('task')
    expect(textOf(result)).not.toContain('Legacy')
  })

  it('lists active workflow states', async () => {
    const listSpy = vi
      .spyOn(client.workflowStates, 'list')
      .mockResolvedValueOnce({
        data: {
          object: 'list',
          data: [mockWorkflowState],
          has_more: false,
          total_count: 1,
          url: '/v1/organizations/org_test_123/workflow-states',
        },
        error: null,
      })

    const result = await handleWorkflowStatesList(client, config, {})
    expect(listSpy).toHaveBeenCalledWith('org_test_123')
    expect(textOf(result)).toContain('todo')
    expect(textOf(result)).toContain('unstarted')
  })

  it('lists milestones with the requested project and status filters', async () => {
    const listSpy = vi.spyOn(client.milestones, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockMilestone],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/milestones',
      },
      error: null,
    })

    const result = await handleMilestonesList(client, config, {
      projectId: 'prj_console',
      status: 'open',
    })
    expect(listSpy).toHaveBeenCalledWith('org_test_123', 'prj_console', {
      status: 'open',
    })
    expect(textOf(result)).toContain('Version 1')
  })

  it('propagates SDK errors from every work-structure list', async () => {
    vi.spyOn(client.workItemTypes, 'list').mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'Missing.' },
    })
    vi.spyOn(client.workflowStates, 'list').mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'Missing.' },
    })
    vi.spyOn(client.milestones, 'list').mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/project-not-found', message: 'Missing.' },
    })

    const workItemTypesResult = await handleWorkItemTypesList(
      client,
      config,
      {}
    )
    const workflowStatesResult = await handleWorkflowStatesList(
      client,
      config,
      {}
    )
    const milestonesResult = await handleMilestonesList(client, config, {
      projectId: 'prj_console',
    })
    expect(workItemTypesResult.isError).toBe(true)
    expect(textOf(workItemTypesResult)).toContain('projects/tenant-not-found')
    expect(workflowStatesResult.isError).toBe(true)
    expect(textOf(workflowStatesResult)).toContain('projects/tenant-not-found')
    expect(milestonesResult.isError).toBe(true)
    expect(textOf(milestonesResult)).toContain('projects/project-not-found')
  })
})
