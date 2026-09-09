import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { WorkTask, WorkTaskList } from '@876/work'

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

    await expect.element(page.getByText('Stale page task')).not.toBeInTheDocument()
    await expect.element(page.getByText('Task B')).toBeVisible()
  })
})
