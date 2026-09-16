// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { RecordStatusBadge } from './record-status-badge'
import type { CustomModuleStatus } from './types'

const STATUSES: CustomModuleStatus[] = [
  { key: 'backlog', label: 'Backlog', category: 'open', position: 0 },
  { key: 'doing', label: 'Doing', category: 'in-progress', position: 1 },
  { key: 'shipped', label: 'Shipped', category: 'done', position: 2 },
]

describe('RecordStatusBadge', () => {
  afterEach(cleanup)

  it('resolves the label from the status list', () => {
    render(<RecordStatusBadge statusKey="doing" statuses={STATUSES} />)

    expect(screen.getByText('Doing')).toBeInTheDocument()
  })

  it('falls back to the raw key for an unknown status', () => {
    render(<RecordStatusBadge statusKey="mystery" statuses={STATUSES} />)

    expect(screen.getByText('mystery')).toBeInTheDocument()
  })

  it('prefers an explicit label over the lookup', () => {
    render(
      <RecordStatusBadge
        statusKey="doing"
        statuses={STATUSES}
        label="Custom"
      />
    )

    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('renders an explicit category without a status list', () => {
    render(<RecordStatusBadge statusKey="x" label="X" category="done" />)

    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('renders each category without crashing', () => {
    const { unmount } = render(
      <RecordStatusBadge statusKey="a" label="A" category="open" />
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    unmount()
    cleanup()

    render(<RecordStatusBadge statusKey="b" label="B" category="in-progress" />)
    expect(screen.getByText('B')).toBeInTheDocument()
    cleanup()

    render(<RecordStatusBadge statusKey="c" label="C" category="done" />)
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('forwards a className', () => {
    render(
      <RecordStatusBadge
        statusKey="doing"
        statuses={STATUSES}
        className="extra-class"
      />
    )

    expect(screen.getByText('Doing')).toHaveClass('extra-class')
  })

  it('ignores change events without a handler', () => {
    render(<RecordStatusBadge statusKey="doing" statuses={STATUSES} />)

    fireEvent.click(screen.getByText('Doing'))
    expect(screen.getByText('Doing')).toBeInTheDocument()
  })
})
