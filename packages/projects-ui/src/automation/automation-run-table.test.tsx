// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AutomationRunTable } from './automation-run-table'
import type { AutomationRun } from './types'

function makeRun(overrides?: Partial<AutomationRun>): AutomationRun {
  return {
    object: 'projects.automation-run',
    id: 'run_1',
    ruleId: 'rule_1',
    eventId: 'evt_1',
    status: 'succeeded',
    errorCode: null,
    attempt: 1,
    startedAt: Date.UTC(2026, 2, 4, 9, 30) / 1000,
    finishedAt: Date.UTC(2026, 2, 4, 9, 31) / 1000,
    ...overrides,
  }
}

describe('AutomationRunTable', () => {
  afterEach(cleanup)

  it('renders the rule id', () => {
    render(<AutomationRunTable runs={[makeRun()]} />)

    expect(screen.getByText('rule_1')).toBeInTheDocument()
  })

  it('badges a succeeded run', () => {
    render(<AutomationRunTable runs={[makeRun({ status: 'succeeded' })]} />)

    expect(screen.getByText('Succeeded')).toBeInTheDocument()
  })

  it('badges a failed run', () => {
    render(<AutomationRunTable runs={[makeRun({ status: 'failed' })]} />)

    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('badges a skipped run', () => {
    render(<AutomationRunTable runs={[makeRun({ status: 'skipped' })]} />)

    expect(screen.getByText('Skipped')).toBeInTheDocument()
  })

  it('renders the error code muted', () => {
    render(
      <AutomationRunTable
        runs={[makeRun({ status: 'failed', errorCode: 'webhook.timeout' })]}
      />
    )
    const code = screen.getByText('webhook.timeout')

    expect(code).toBeInTheDocument()
    expect(code).toHaveClass('text-muted-foreground')
  })

  it('renders a dash when there is no error code', () => {
    render(<AutomationRunTable runs={[makeRun()]} />)

    expect(
      within(screen.getByRole('table')).getAllByText('—').length
    ).toBeGreaterThan(0)
  })

  it('renders the attempt count', () => {
    render(<AutomationRunTable runs={[makeRun({ attempt: 3 })]} />)

    expect(within(screen.getByRole('table')).getByText('3')).toBeInTheDocument()
  })

  it('renders started and finished times', () => {
    render(<AutomationRunTable runs={[makeRun()]} />)

    expect(screen.getByText('Mar 4, 2026 09:30 UTC')).toBeInTheDocument()
    expect(screen.getByText('Mar 4, 2026 09:31 UTC')).toBeInTheDocument()
  })

  it('renders a dash for an unfinished run', () => {
    render(<AutomationRunTable runs={[makeRun({ finishedAt: null })]} />)

    expect(screen.getByText('Mar 4, 2026 09:30 UTC')).toBeInTheDocument()
  })

  it('labels the columns in table order', () => {
    render(<AutomationRunTable runs={[makeRun()]} />)

    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    expect(headers).toEqual([
      'Rule',
      'Status',
      'Error',
      'Attempt',
      'Started',
      'Finished',
    ])
  })

  it('renders the empty state', () => {
    render(<AutomationRunTable runs={[]} />)

    expect(screen.getByText('No automation runs yet')).toBeInTheDocument()
  })
})
