import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { WorkMyWork } from '@876/work'

import { WorkWidgetCalendarView } from './work-widget-calendar'

function success(data: unknown) {
  return Response.json({ data, error: null }, { status: 200 })
}

function workForRequest(url: string): WorkMyWork {
  const parsed = new URL(url, window.location.origin)
  return {
    object: 'my_work',
    organizationId: 'org_1',
    userId: 'user_1',
    from: Number(parsed.searchParams.get('from')),
    to: Number(parsed.searchParams.get('to')),
    tasks: [],
    reminders: [],
    events: [],
    overdueTasks: [],
  }
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WorkWidgetCalendarView range orchestration', () => {
  it('reuses loaded month/week ranges for date selection and retries explicit range errors', async () => {
    let myWorkCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/calendars')
        return success({
          object: 'list',
          data: [],
          has_more: false,
          total_count: 0,
          url: '/v1/organizations/org_1/calendars',
        })

      if (url.startsWith('/api/my-work?')) {
        myWorkCalls += 1
        if (myWorkCalls === 3)
          return Response.json(
            {
              data: null,
              error: {
                code: 'work/unavailable',
                message: 'Calendar refresh failed.',
              },
            },
            { status: 503 }
          )
        return success(workForRequest(url))
      }

      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const now = new Date()
    const monthTarget = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() === 15 ? 16 : 15
    )

    render(<WorkWidgetCalendarView />)

    await expect
      .element(page.getByRole('button', { name: 'Next' }))
      .toBeVisible()
    await vi.waitFor(() => expect(myWorkCalls).toBe(1))

    await page
      .getByRole('button', { name: monthTarget.toLocaleDateString() })
      .click()
    expect(myWorkCalls).toBe(1)

    await page.getByRole('button', { name: /week/i }).click()
    await vi.waitFor(() => expect(myWorkCalls).toBe(2))

    const weekStart = addDays(monthTarget, -monthTarget.getDay())
    const weekTarget = addDays(weekStart, monthTarget.getDay() === 0 ? 1 : 0)
    await page
      .getByRole('region', { name: weekTarget.toLocaleDateString() })
      .getByRole('button')
      .click()
    expect(myWorkCalls).toBe(2)

    await page.getByRole('button', { name: 'Next' }).click()
    await expect
      .element(page.getByText('Calendar refresh failed.'))
      .toBeVisible()
    expect(myWorkCalls).toBe(3)

    await page.getByRole('button', { name: 'Try again' }).click()

    await vi.waitFor(() => expect(myWorkCalls).toBe(4))
    await expect
      .element(page.getByText('Calendar refresh failed.'))
      .not.toBeInTheDocument()
  })
})
