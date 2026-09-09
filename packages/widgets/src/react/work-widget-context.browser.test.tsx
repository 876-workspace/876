import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'

import {
  WorkWidgetContextProvider,
  WorkWidgetContextSetter,
  useWorkWidgetBrowserClient,
  useWorkWidgetHostContext,
} from './work-widget-context'

const CONTEXT_A = {
  service: 'billing',
  resource: 'invoice',
  externalId: 'inv_a',
  label: 'INV-A',
  url: '/invoices/inv_a',
} as const
const CONTEXT_B = {
  service: 'billing',
  resource: 'invoice',
  externalId: 'inv_b',
  label: 'INV-B',
  url: '/invoices/inv_b',
} as const

function Probe() {
  const context = useWorkWidgetHostContext()
  const client = useWorkWidgetBrowserClient()

  return (
    <>
      <output aria-label="active-context">
        {context ? JSON.stringify(context) : 'none'}
      </output>
      <button
        type="button"
        onClick={() => {
          if (context) void client.tasks.create({ title: 'Follow up' }, context)
        }}
      >
        Create contextual task
      </button>
    </>
  )
}

function TransitionHarness() {
  const [showA, setShowA] = useState(true)
  const [showB, setShowB] = useState(true)

  return (
    <WorkWidgetContextProvider>
      {showA ? (
        <WorkWidgetContextSetter
          context={CONTEXT_A}
          routeBase="/api/invoices/inv_a/work"
        />
      ) : null}
      {showB ? (
        <WorkWidgetContextSetter
          context={CONTEXT_B}
          routeBase="/api/invoices/inv_b/work"
        />
      ) : null}
      <Probe />
      <button type="button" onClick={() => setShowA(false)}>
        Remove A
      </button>
      <button type="button" onClick={() => setShowB(false)}>
        Remove B
      </button>
    </WorkWidgetContextProvider>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Work widget host context', () => {
  it('publishes the exact context and its separate host-owned route', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ data: { object: 'task', id: 'task_1' }, error: null })
      )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <WorkWidgetContextProvider>
        <WorkWidgetContextSetter
          context={CONTEXT_A}
          routeBase="/api/invoices/inv_a/work"
        />
        <Probe />
      </WorkWidgetContextProvider>
    )

    await expect
      .element(page.getByLabelText('active-context'))
      .toHaveTextContent(JSON.stringify(CONTEXT_A))
    await page.getByRole('button', { name: 'Create contextual task' }).click()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/invoices/inv_a/work/tasks')
  })

  it('prevents an older setter cleanup from erasing a newer context', async () => {
    render(<TransitionHarness />)

    await expect
      .element(page.getByLabelText('active-context'))
      .toHaveTextContent(JSON.stringify(CONTEXT_B))

    await page.getByRole('button', { name: 'Remove A' }).click()
    await expect
      .element(page.getByLabelText('active-context'))
      .toHaveTextContent(JSON.stringify(CONTEXT_B))

    await page.getByRole('button', { name: 'Remove B' }).click()
    await expect
      .element(page.getByLabelText('active-context'))
      .toHaveTextContent('none')
  })
})
