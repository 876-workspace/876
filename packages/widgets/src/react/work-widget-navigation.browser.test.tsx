import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'

import {
  EMPTY_WORK_WIDGET_CAPABILITIES,
  type WorkWidgetCapabilities,
} from '../work-capabilities'
import { WorkWidgetPanel } from './work-widget'

function success(data: unknown) {
  return Response.json({ data, error: null })
}

const CAPABILITIES: WorkWidgetCapabilities = {
  ...EMPTY_WORK_WIDGET_CAPABILITIES,
  canCreateTasks: true,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Work widget navigation shortcuts', () => {
  it('switches views with Alt+number but ignores shortcuts while typing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.startsWith('/api/my-work?'))
          return Promise.resolve(
            success({
              object: 'my_work',
              organizationId: 'org_1',
              userId: 'user_1',
              from: 100,
              to: 200,
              tasks: [],
              reminders: [],
              events: [],
              overdueTasks: [],
            })
          )
        if (url === '/api/task-lists' || url === '/api/tasks')
          return Promise.resolve(
            success({
              object: 'list',
              data: [],
              has_more: false,
              total_count: 0,
              url,
            })
          )
        if (url === '/api/calendars')
          return Promise.resolve(
            success({
              object: 'list',
              data: [],
              has_more: false,
              total_count: 0,
              url: '/api/calendars',
            })
          )
        throw new Error(`Unexpected request: ${url}`)
      })
    )

    render(<WorkWidgetPanel capabilities={CAPABILITIES} />)

    await page.getByRole('button', { name: /create/i }).click()
    await expect
      .element(page.getByRole('region', { name: 'Create Work' }))
      .toBeVisible()

    const title = page.getByRole('textbox', { name: 'Title' })
    await title.click()
    await userEvent.keyboard('{Alt>}2{/Alt}')
    await expect.element(title).toBeVisible()

    await page.getByRole('button', { name: 'create', exact: true }).click()
    await userEvent.keyboard('{Alt>}2{/Alt}')
    await expect
      .element(page.getByRole('region', { name: 'Tasks' }))
      .toBeVisible()
  })
})
