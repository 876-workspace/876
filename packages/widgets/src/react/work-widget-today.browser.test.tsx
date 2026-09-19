import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { WorkMyWork, WorkReminder, WorkTask } from '@876/work'

import { EMPTY_WORK_WIDGET_CAPABILITIES } from '../work-capabilities'
import { WorkWidgetTodayView } from './work-widget-today'

const TASK: WorkTask = {
  object: 'task',
  id: 'task_1',
  uid: 'task-uid-1',
  organizationId: 'org_1',
  listId: 'list_1',
  parentTaskId: null,
  context: null,
  links: [],
  title: 'Finish follow-up',
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

const DONE_TASK: WorkTask = {
  ...TASK,
  status: 'DONE',
  percentComplete: 100,
  completedAt: 200,
  completedBy: 'user_1',
  updatedAt: 200,
}

function reminder(id: string, title: string): WorkReminder {
  return {
    object: 'reminder',
    id,
    organizationId: 'org_1',
    context: null,
    title,
    note: null,
    remindAt: Math.floor(Date.now() / 1000),
    offsetMinutesBeforeDue: null,
    channel: 'in-app',
    timeZone: 'UTC',
    recurrenceRuleId: null,
    userId: 'user_1',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    createdBy: 'user_1',
    createdAt: 100,
    updatedAt: 100,
  }
}

function myWork(reminderValue: WorkReminder): WorkMyWork {
  const now = Math.floor(Date.now() / 1000)
  return {
    object: 'my_work',
    organizationId: 'org_1',
    userId: 'user_1',
    from: now - 60,
    to: now + 60 * 60,
    tasks: [{ ...TASK, dueAt: now }],
    reminders: [reminderValue],
    events: [],
    overdueTasks: [],
  }
}

function success(data: unknown) {
  return Response.json({ data, error: null }, { status: 200 })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WorkWidgetTodayView refresh resilience', () => {
  it('keeps successful Today data mounted when refresh fails and retries from the banner', async () => {
    let myWorkCalls = 0
    const initialWork = myWork(reminder('reminder_1', 'Daily standup'))
    const refreshedWork = myWork(reminder('reminder_2', 'Fresh reminder'))

    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.startsWith('/api/my-work?')) {
          myWorkCalls += 1
          if (myWorkCalls === 1) return success(initialWork)
          if (myWorkCalls === 2)
            return Response.json(
              {
                data: null,
                error: { code: 'work/unavailable', message: 'Refresh failed.' },
              },
              { status: 503 }
            )
          return success(refreshedWork)
        }

        if (url === '/api/tasks/task_1' && init?.method === 'PATCH')
          return success(DONE_TASK)

        throw new Error(`Unexpected request: ${url}`)
      }
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <WorkWidgetTodayView
        capabilities={{
          ...EMPTY_WORK_WIDGET_CAPABILITIES,
          canEditTasks: true,
        }}
      />
    )

    await expect.element(page.getByText('Daily standup')).toBeVisible()
    await page
      .getByRole('button', { name: 'Mark Finish follow-up complete' })
      .click()

    await expect.element(page.getByText('Refresh failed.')).toBeVisible()
    await expect.element(page.getByText('Daily standup')).toBeVisible()

    await page.getByRole('button', { name: 'Try again' }).click()

    await expect.element(page.getByText('Fresh reminder')).toBeVisible()
    await expect
      .element(page.getByText('Refresh failed.'))
      .not.toBeInTheDocument()
    expect(myWorkCalls).toBe(3)
  })
})
