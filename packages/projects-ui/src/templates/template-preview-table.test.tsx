// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { TemplatePreviewTable } from './template-preview-table'
import type { TemplatePreview } from './types'

const STARTS_AT = Date.UTC(2026, 2, 2) / 1000
const ENDS_AT = Date.UTC(2026, 2, 13) / 1000
const DUE_AT = Date.UTC(2026, 2, 9) / 1000

function makePreview(overrides?: Partial<TemplatePreview>): TemplatePreview {
  return {
    object: 'projects.template-preview',
    startDate: STARTS_AT,
    phases: [
      { ref: 'phase-1', name: 'Discovery', start: STARTS_AT, end: ENDS_AT },
    ],
    workItems: [
      { ref: 'item-1', title: 'Kickoff', start: STARTS_AT, due: DUE_AT },
    ],
    missing: { workItemTypes: [], workflowStates: [], labels: [] },
    ...overrides,
  }
}

function tables(): [HTMLElement, HTMLElement] {
  const [phases, workItems] = screen.getAllByRole('table')
  if (!phases || !workItems)
    throw new Error('Expected a phases and a work items table')
  return [phases, workItems]
}

describe('TemplatePreviewTable', () => {
  afterEach(cleanup)

  it('renders the start date the offsets were computed from', () => {
    render(<TemplatePreviewTable preview={makePreview()} />)

    expect(screen.getByText('Starts Mar 2, 2026')).toBeInTheDocument()
  })

  it('renders each phase with its computed start and end dates', () => {
    render(<TemplatePreviewTable preview={makePreview()} />)

    const [phases] = tables()

    expect(within(phases).getByText('Discovery')).toBeInTheDocument()
    expect(within(phases).getByText('Mar 2, 2026')).toBeInTheDocument()
    expect(within(phases).getByText('Mar 13, 2026')).toBeInTheDocument()
  })

  it('renders an em dash for a phase with no computed dates', () => {
    render(
      <TemplatePreviewTable
        preview={makePreview({
          phases: [
            { ref: 'phase-1', name: 'Discovery', start: null, end: null },
          ],
        })}
      />
    )

    const [phases] = tables()

    expect(within(phases).getAllByText('—')).toHaveLength(2)
  })

  it('renders each work item with its computed start and due dates', () => {
    render(<TemplatePreviewTable preview={makePreview()} />)

    const [, workItems] = tables()

    expect(within(workItems).getByText('Kickoff')).toBeInTheDocument()
    expect(within(workItems).getByText('Mar 2, 2026')).toBeInTheDocument()
    expect(within(workItems).getByText('Mar 9, 2026')).toBeInTheDocument()
  })

  it('renders an em dash for a work item with no computed dates', () => {
    render(
      <TemplatePreviewTable
        preview={makePreview({
          workItems: [
            { ref: 'item-1', title: 'Kickoff', start: null, due: null },
          ],
        })}
      />
    )

    const [, workItems] = tables()

    expect(within(workItems).getAllByText('—')).toHaveLength(2)
  })

  it('renders the phases table before the work items table', () => {
    render(<TemplatePreviewTable preview={makePreview()} />)

    const [phases, workItems] = tables()

    expect(within(phases).queryByText('Kickoff')).toBeNull()
    expect(within(workItems).queryByText('Discovery')).toBeNull()
  })

  it('renders every phase and work item row', () => {
    render(
      <TemplatePreviewTable
        preview={makePreview({
          phases: [
            {
              ref: 'phase-1',
              name: 'Discovery',
              start: STARTS_AT,
              end: ENDS_AT,
            },
            { ref: 'phase-2', name: 'Build', start: ENDS_AT, end: null },
          ],
          workItems: [
            { ref: 'item-1', title: 'Kickoff', start: STARTS_AT, due: DUE_AT },
            { ref: 'item-2', title: 'Review', start: null, due: DUE_AT },
            { ref: 'item-3', title: 'Ship', start: DUE_AT, due: ENDS_AT },
          ],
        })}
      />
    )

    const [phases, workItems] = tables()

    expect(within(phases).getAllByRole('row')).toHaveLength(3)
    expect(within(workItems).getAllByRole('row')).toHaveLength(4)
  })

  it('renders no notice when nothing is missing', () => {
    render(<TemplatePreviewTable preview={makePreview()} />)

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders a destructive notice listing the missing keys', () => {
    render(
      <TemplatePreviewTable
        preview={makePreview({
          missing: {
            workItemTypes: ['Bug', 'Spike'],
            workflowStates: ['In review'],
            labels: ['urgent'],
          },
        })}
      />
    )

    const notice = screen.getByRole('alert')

    expect(notice).toHaveClass('text-destructive')
    expect(screen.getByText('Work item types: Bug, Spike')).toBeInTheDocument()
    expect(screen.getByText('Workflow states: In review')).toBeInTheDocument()
    expect(screen.getByText('Labels: urgent')).toBeInTheDocument()
  })

  it('renders only the missing groups that have keys', () => {
    render(
      <TemplatePreviewTable
        preview={makePreview({
          missing: {
            workItemTypes: [],
            workflowStates: [],
            labels: ['urgent'],
          },
        })}
      />
    )

    expect(screen.getByText('Labels: urgent')).toBeInTheDocument()
    expect(screen.queryByText(/Work item types:/)).toBeNull()
    expect(screen.queryByText(/Workflow states:/)).toBeNull()
  })

  it('renders a no-phases row when the definition has no phases', () => {
    render(<TemplatePreviewTable preview={makePreview({ phases: [] })} />)

    const [phases, workItems] = tables()

    expect(within(phases).getByText('No phases')).toBeInTheDocument()
    expect(within(workItems).getByText('Kickoff')).toBeInTheDocument()
  })

  it('renders a no-work-items row when the definition has no work items', () => {
    render(<TemplatePreviewTable preview={makePreview({ workItems: [] })} />)

    const [phases, workItems] = tables()

    expect(within(workItems).getByText('No work items')).toBeInTheDocument()
    expect(within(phases).getByText('Discovery')).toBeInTheDocument()
  })
})
