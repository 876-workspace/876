import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { WorkTask, WorkTaskList } from '@876/work'
import { createBrowserWork } from '@876/work/browser'

import { EMPTY_WORK_WIDGET_CAPABILITIES } from '../work-capabilities'
import { WorkWidgetTasksView } from './work-widget-tasks'

function task(id: string, title: string, listId: string): WorkTask {
  return {
    object: 'task',
    id,
    uid: `${id}-uid`,
    organizationId: 'org_1',
    listId,
    parentTaskId: null,
    context: null,
    links: [],
    title,
    description: null,
    status: 'OPEN',
    importance: 'NORMAL',
    priorityId: null,
    assigneeId: 'user_1',
    assignments: [],
    startAt: null,
    startTimeZone: null,
    dueAt: null,
    dueTimeZone: null,
    estimatedDuration: null,
    percentComplete: 0,
    recurrenceRuleId: null,
    completedAt: null,
    completedBy: null,
    isOverdue: false,
    sortOrder: 0,
    createdBy: 'user_1',
    createdAt: 100,
    updatedAt: 100,
  }
}

function taskList(id: string, name: string): WorkTaskList {
  return {
    object: 'task_list',
    id,
    organizationId: 'org_1',
    name,
    description: null,
    ownerUserId: 'user_1',
    isDefault: false,
    sortOrder: 0,
    createdBy: 'user_1',
    createdAt: 100,
    updatedAt: 100,
  }
}

function pageResult(data: WorkTask[], hasMore: boolean) {
  return {
    object: 'list' as const,
    data,
    has_more: hasMore,
    total_count: null,
    url: '/v1/organizations/org_1/tasks',
  }
}

function success(data: unknown) {
  return Response.json({ data, error: null }, { status: 200 })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WorkWidgetTasksView pagination races', () => {
  it('does not append a stale load-more page after switching task lists', async () => {
    const listA = taskList('list_a', 'List A')
    const listB = taskList('list_b', 'List B')
    const taskA = task('task_a', 'Task A', 'list_a')
    const taskB = task('task_b', 'Task B', 'list_b')
    const staleTask = task('task_stale', 'Stale page task', 'list_a')

    let resolveStalePage: (response: Response) => void = () => undefined
    const stalePage = new Promise<Response>((resolve) => {
      resolveStalePage = resolve
    })

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/task-lists')
        return Promise.resolve(
          success({
            object: 'list',
            data: [listA, listB],
            has_more: false,
            total_count: 2,
            url: '/v1/organizations/org_1/task-lists',
          })
        )
      if (url === '/api/tasks')
        return Promise.resolve(success(pageResult([taskA], true)))
      if (url === '/api/tasks?startingAfter=task_a') return stalePage
      if (url === '/api/tasks?listId=list_b')
        return Promise.resolve(success(pageResult([taskB], false)))

      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <WorkWidgetTasksView capabilities={EMPTY_WORK_WIDGET_CAPABILITIES} />
    )

    await expect.element(page.getByText('Task A')).toBeVisible()
    await page.getByRole('button', { name: 'Load more' }).click()
    await page.getByRole('button', { name: 'List B' }).click()

    await expect.element(page.getByText('Task B')).toBeVisible()

    resolveStalePage(success(pageResult([staleTask], false)))

    await expect
      .element(page.getByText('Stale page task'))
      .not.toBeInTheDocument()
    await expect.element(page.getByText('Task B')).toBeVisible()
  })

  it('keeps a contextual task visible after creating and reloading it', async () => {
    const createdTask = task('task_created', 'Review INV-123', 'list_1')
    let taskLoads = 0
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/task-lists')
        return Promise.resolve(
          success({
            object: 'list',
            data: [],
            has_more: false,
            total_count: 0,
            url: '/v1/organizations/org_1/task-lists',
          })
        )
      if (url === '/api/invoices/inv_123/work/tasks' && init?.method === 'POST')
        return Promise.resolve(success(createdTask))
      if (url === '/api/invoices/inv_123/work/tasks') {
        taskLoads += 1
        return Promise.resolve(
          success(pageResult(taskLoads === 1 ? [] : [createdTask], false))
        )
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <WorkWidgetTasksView
        capabilities={{
          ...EMPTY_WORK_WIDGET_CAPABILITIES,
          canCreateTasks: true,
        }}
        client={createBrowserWork({
          contextRouteBase: '/api/invoices/inv_123/work',
        })}
        context={{
          service: 'billing',
          resource: 'invoice',
          externalId: 'inv_123',
        }}
      />
    )

    await expect
      .element(page.getByText('No active tasks in this list.'))
      .toBeVisible()
    await page.getByText('Add task', { exact: true }).first().click()
    await page.getByPlaceholder('Task title').fill('Review INV-123')
    await page.getByRole('button', { name: 'Add task' }).click()

    await expect.element(page.getByText('Review INV-123')).toBeVisible()
    expect(taskLoads).toBe(2)
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST'
    )
    expect(post?.[0]).toBe('/api/invoices/inv_123/work/tasks')
    expect(String(post?.[1]?.body)).not.toContain('inv_123')
  })
})
