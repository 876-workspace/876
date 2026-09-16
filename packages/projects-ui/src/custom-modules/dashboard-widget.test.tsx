// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DashboardWidget } from './dashboard-widget'
import type { CustomModuleWidget } from './types'

function makeWidget(
  overrides?: Partial<CustomModuleWidget>
): CustomModuleWidget {
  return {
    object: 'projects.dashboard-widget',
    id: 'w_1',
    kind: 'record-count',
    moduleId: 'mod_1',
    title: 'Risks overview',
    position: 0,
    ...overrides,
  }
}

describe('DashboardWidget', () => {
  afterEach(cleanup)

  it('renders the widget title', () => {
    render(
      <DashboardWidget
        widget={makeWidget()}
        data={{ kind: 'record-count', count: 12 }}
      />
    )

    expect(screen.getByText('Risks overview')).toBeInTheDocument()
  })

  it('renders a record count', () => {
    render(
      <DashboardWidget
        widget={makeWidget()}
        data={{ kind: 'record-count', count: 12 }}
      />
    )

    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders a status breakdown with counts and bars', () => {
    const { container } = render(
      <DashboardWidget
        widget={makeWidget({ kind: 'status-breakdown' })}
        data={{
          kind: 'status-breakdown',
          rows: [
            { statusKey: 'backlog', label: 'Backlog', count: 4 },
            { statusKey: 'doing', label: 'Doing', count: 2 },
          ],
        }}
      />
    )

    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('Doing')).toBeInTheDocument()
    expect(container.querySelector('[data-status-bar="backlog"]')).not.toBeNull()
    expect(container.querySelector('[data-status-bar="doing"]')).not.toBeNull()
  })

  it('scales breakdown bars to the largest row', () => {
    const { container } = render(
      <DashboardWidget
        widget={makeWidget({ kind: 'status-breakdown' })}
        data={{
          kind: 'status-breakdown',
          rows: [
            { statusKey: 'backlog', label: 'Backlog', count: 4 },
            { statusKey: 'doing', label: 'Doing', count: 2 },
          ],
        }}
      />
    )

    const full = container.querySelector<HTMLElement>(
      '[data-status-bar="backlog"]'
    )
    const half = container.querySelector<HTMLElement>(
      '[data-status-bar="doing"]'
    )

    expect(full?.style.width).toBe('100%')
    expect(half?.style.width).toBe('50%')
  })

  it('renders an empty hint for an empty breakdown', () => {
    render(
      <DashboardWidget
        widget={makeWidget({ kind: 'status-breakdown' })}
        data={{ kind: 'status-breakdown', rows: [] }}
      />
    )

    expect(screen.getByText('No items')).toBeInTheDocument()
  })

  it('renders recent records with titles', () => {
    render(
      <DashboardWidget
        widget={makeWidget({ kind: 'recent-records' })}
        data={{
          kind: 'recent-records',
          records: [
            {
              id: 'rec_1',
              title: 'Fix login',
              statusKey: 'doing',
              updatedAt: Date.UTC(2026, 2, 4) / 1000,
            },
          ],
        }}
      />
    )

    expect(screen.getByText('Fix login')).toBeInTheDocument()
    expect(screen.getByText('Mar 4, 2026', { exact: false })).toBeInTheDocument()
  })

  it('renders an empty hint for no recent records', () => {
    render(
      <DashboardWidget
        widget={makeWidget({ kind: 'recent-records' })}
        data={{ kind: 'recent-records', records: [] }}
      />
    )

    expect(screen.getByText('No items')).toBeInTheDocument()
  })

  it('renders a mismatch notice when kinds disagree', () => {
    render(
      <DashboardWidget
        widget={makeWidget({ kind: 'record-count' })}
        data={{ kind: 'status-breakdown', rows: [] }}
      />
    )

    expect(screen.getByText('Widget data mismatch')).toBeInTheDocument()
  })
})
