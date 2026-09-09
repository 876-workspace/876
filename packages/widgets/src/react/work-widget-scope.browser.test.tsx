import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { WorkTask } from '@876/work'
import { createBrowserWork } from '@876/work/browser'

import { EMPTY_WORK_WIDGET_CAPABILITIES } from '../work-capabilities'
import { WorkWidgetPanel } from './work-widget'

const CONTEXT = {
  service: 'billing',
  resource: 'invoice',
  externalId: 'inv_1',
  label: 'INV-001',
  url: '/invoices/inv_1',
} as const

function task(id: string, title: string): WorkTask {
  return {
    object: 'task',
    id,
    uid: `${id}@work.876`,
    organizationId: 'org_1',
    listId: 'list_1',
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
    dueAt: Math.floor(Date.now() / 1000),
    dueTimeZone: 'UTC',
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

function agenda(object: 'my_work' | 'resource_work', item: WorkTask) {
  const now = Math.floor(Date.now() / 1000)
  return {
    object,
    organizationId: 'org_1',
    ...(object === 'my_work'
      ? { userId: 'user_1' }
      : {
          context: {
            service: 'billing',
            resource: 'invoice',
            externalId: 'inv_1',
          },
        }),
    from: now - 60,
    to: now + 60,
    tasks: [item],
    reminders: [],
    events: [],
    overdueTasks: [],
  }
}

function success(data: unknown) {
  return Response.json({ data, error: null })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Work widget scope', () => {
  it('does not render the scope control without a host context', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(success(agenda('my_work', task('a', 'Mine'))))
    )

    render(<WorkWidgetPanel />)

    await expect.element(page.getByText('Mine')).toBeVisible()
    await expect
      .element(page.getByRole('combobox', { name: 'Work scope' }))
      .not.toBeInTheDocument()
  })

  it('switches to the current resource and ignores a late My Work response', async () => {
    let resolvePersonal: (response: Response) => void = () => undefined
    const personal = new Promise<Response>((resolve) => {
      resolvePersonal = resolve
    })
    const resource = agenda(
      'resource_work',
      task('context', 'Invoice follow-up')
    )
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/my-work?')) return personal
      if (url.startsWith('/api/invoices/inv_1/work?'))
        return Promise.resolve(success(resource))
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <WorkWidgetPanel
        capabilities={EMPTY_WORK_WIDGET_CAPABILITIES}
        context={CONTEXT}
        client={createBrowserWork({
          contextRouteBase: '/api/invoices/inv_1/work',
        })}
      />
    )

    await page
      .getByRole('combobox', { name: 'Work scope' })
      .selectOptions('context')
    await expect.element(page.getByText('Invoice follow-up')).toBeVisible()

    resolvePersonal(success(agenda('my_work', task('mine', 'Late personal'))))
    await expect
      .element(page.getByText('Late personal'))
      .not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices/inv_1/work?'),
      expect.anything()
    )
  })
})
