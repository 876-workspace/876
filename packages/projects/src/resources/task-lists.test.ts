import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  taskListListSchema,
  taskListSchema,
  workBreakdownSchema,
  deletedSchema,
} from '../types'
import { createTaskListsResource } from './task-lists'

describe('task-lists resource', () => {
  const resource = createTaskListsResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists project task lists with an archive opt-in query', async () => {
    await resource.list('org 1', 'prj/1')
    await resource.list('org 1', 'prj/1', { includeArchived: true })

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj%2F1/task-lists',
        signal: undefined,
      },
      taskListListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj%2F1/task-lists?includeArchived=true',
        signal: undefined,
      },
      taskListListSchema
    )
  })

  it('creates a task list under a project', async () => {
    const input = { name: 'Backend', milestoneId: 'ms_1' }
    await resource.create('org 1', 'prj_1', input)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/projects/prj_1/task-lists',
        body: input,
      }),
      taskListSchema
    )
  })

  it('retrieves, updates, and deletes a task list', async () => {
    await resource.retrieve('org 1', 'tl/1')
    await resource.update('org 1', 'tl/1', { name: 'Frontend' })
    await resource.delete('org 1', 'tl/1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org%201/task-lists/tl%2F1',
      }),
      taskListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ method: 'PATCH' }),
      taskListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      expect.objectContaining({ method: 'DELETE' }),
      deletedSchema
    )
  })

  it('archives and restores a task list', async () => {
    await resource.archive('org 1', 'tl_1')
    await resource.restore('org 1', 'tl_1')

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/task-lists/tl_1/archive',
      }),
      taskListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/task-lists/tl_1/restore',
      }),
      taskListSchema
    )
  })

  it('reorders task lists with ordered ids', async () => {
    await resource.reorder('org 1', 'prj_1', { orderedIds: ['tl_2', 'tl_1'] })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PUT',
        path: '/v1/organizations/org%201/projects/prj_1/task-lists/order',
      }),
      taskListListSchema
    )
  })

  it('moves issues into a task list', async () => {
    await resource.moveIssues('org 1', 'tl_1', { issueIds: ['iss_1'] })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/task-lists/tl_1/issues',
      }),
      taskListSchema
    )
  })

  it('fetches the project work breakdown', async () => {
    await resource.workBreakdown('org 1', 'prj_1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj_1/work-breakdown',
      }),
      workBreakdownSchema
    )
  })
})
