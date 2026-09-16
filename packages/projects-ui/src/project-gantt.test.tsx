// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type {
  Gantt,
  GanttEdge,
  GanttRow,
  GanttZoom,
} from '@876/projects/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProjectGantt, type GanttReschedule } from './project-gantt'

const DAY = 86400
const ISSUES_BASE = '/issues'

/** Sep 2026, in UTC, so every zoom assertion is stable across machines. */
function day(offset: number): number {
  return Date.UTC(2026, 8, 1) / 1000 + offset * DAY
}

function row(overrides: Partial<GanttRow> & Pick<GanttRow, 'id'>): GanttRow {
  return {
    object: 'gantt-row',
    kind: 'work-item',
    parentRowId: null,
    issueId: null,
    name: 'Work item',
    plannedStart: null,
    plannedFinish: null,
    actualStart: null,
    actualFinish: null,
    percentComplete: 0,
    isCritical: false,
    ...overrides,
  }
}

const rows: GanttRow[] = [
  row({
    id: 'row-phase-1',
    kind: 'phase',
    name: 'Discovery',
    plannedStart: day(0),
    plannedFinish: day(4),
  }),
  row({
    id: 'row-list-1',
    kind: 'task-list',
    parentRowId: 'row-phase-1',
    name: 'Research',
    plannedStart: day(0),
    plannedFinish: day(2),
  }),
  row({
    id: 'row-item-1',
    kind: 'work-item',
    parentRowId: 'row-list-1',
    issueId: 'iss_1',
    name: 'Interview customers',
    plannedStart: day(0),
    plannedFinish: day(4),
    actualStart: day(1),
    actualFinish: day(3),
    percentComplete: 50,
    isCritical: true,
  }),
  row({
    id: 'row-item-2',
    kind: 'work-item',
    parentRowId: 'row-list-1',
    issueId: 'iss_2',
    name: 'Draft the brief',
    plannedStart: day(5),
    plannedFinish: day(7),
  }),
  row({
    id: 'row-sub-1',
    kind: 'sub-item',
    parentRowId: 'row-item-2',
    issueId: 'iss_3',
    name: 'Outline the sections',
    plannedStart: day(5),
    plannedFinish: day(6),
  }),
  row({
    id: 'row-list-2',
    kind: 'task-list',
    name: 'Delivery',
    plannedStart: day(5),
    plannedFinish: day(9),
  }),
]

const edges: GanttEdge[] = [
  {
    object: 'gantt-edge',
    id: 'edge_1',
    predecessorIssueId: 'iss_1',
    successorIssueId: 'iss_2',
    type: 'finish-to-start',
    lagMinutes: 0,
  },
  {
    object: 'gantt-edge',
    id: 'edge_2',
    predecessorIssueId: 'iss_2',
    successorIssueId: 'iss_3',
    type: 'finish-to-start',
    lagMinutes: 0,
  },
]

function makeGantt(overrides: Partial<Gantt> = {}): Gantt {
  return {
    object: 'gantt',
    rows,
    edges,
    criticalIssueIds: ['iss_1'],
    range: { start: day(0), end: day(9) },
    ...overrides,
  }
}

function renderGantt({
  gantt = makeGantt(),
  zoom = 'day',
  canEdit = true,
}: {
  gantt?: Gantt
  zoom?: GanttZoom
  canEdit?: boolean
} = {}) {
  const onZoomChange = vi.fn<(zoom: GanttZoom) => void>()
  const onReschedule = vi.fn<(change: GanttReschedule) => void>()

  const view = render(
    <ProjectGantt
      gantt={gantt}
      issuesBaseHref={ISSUES_BASE}
      zoom={zoom}
      onZoomChange={onZoomChange}
      onReschedule={onReschedule}
      canEdit={canEdit}
    />
  )

  return { onZoomChange, onReschedule, ...view }
}

function rowIds(container: HTMLElement): (string | null)[] {
  return Array.from(container.querySelectorAll('[data-gantt-row]')).map(
    (element) => element.getAttribute('data-gantt-row')
  )
}

function barFor(id: string): HTMLElement {
  const bar = document.querySelector(`[data-gantt-bar="${id}"]`)
  if (!bar) throw new Error(`Missing bar for row ${id}`)
  return bar as HTMLElement
}

describe('ProjectGantt', () => {
  afterEach(cleanup)

  it('renders the row hierarchy in payload order', () => {
    const { container } = renderGantt()

    expect(rowIds(container)).toEqual([
      'row-phase-1',
      'row-list-1',
      'row-item-1',
      'row-item-2',
      'row-sub-1',
      'row-list-2',
    ])
  })

  it('links a work item row to the issues base href', () => {
    renderGantt()

    expect(
      screen.getByRole('link', { name: 'Interview customers' })
    ).toHaveAttribute('href', `${ISSUES_BASE}/iss_1`)
  })

  it('collapsing a phase hides every descendant row', () => {
    const { container } = renderGantt()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Discovery' }))

    expect(rowIds(container)).toEqual(['row-phase-1', 'row-list-2'])
  })

  it('expanding a collapsed phase restores its descendants', () => {
    const { container } = renderGantt()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Discovery' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand Discovery' }))

    expect(rowIds(container)).toHaveLength(6)
  })

  it('marks critical rows on the row and on the bar', () => {
    const { container } = renderGantt()

    expect(screen.getAllByText('Critical path')).toHaveLength(1)
    expect(container.querySelectorAll('[data-critical="true"]')).toHaveLength(1)
    expect(barFor('row-item-1')).toHaveAttribute('data-critical', 'true')
  })

  it('renders one bar per scheduled row', () => {
    const { container } = renderGantt()

    expect(container.querySelectorAll('[data-gantt-bar]')).toHaveLength(6)
    expect(container.querySelectorAll('[data-gantt-progress]')).toHaveLength(6)
  })

  it('renders the actual overlay only for rows with actual dates', () => {
    const { container } = renderGantt()

    expect(container.querySelectorAll('[data-gantt-actual]')).toHaveLength(1)
  })

  it('draws one connector per dependency edge', () => {
    const { container } = renderGantt()

    expect(container.querySelectorAll('[data-gantt-connector]')).toHaveLength(
      edges.length
    )
  })

  it('labels the day zoom columns with the month group and the day number', () => {
    const { container } = renderGantt({ zoom: 'day' })

    expect(container.querySelectorAll('[data-gantt-column]')).toHaveLength(14)
    expect(screen.getAllByText('Sep 2026').length).toBeGreaterThan(0)
  })

  it('labels the week zoom columns with the week start date', () => {
    const { container } = renderGantt({ zoom: 'week' })

    expect(container.querySelectorAll('[data-gantt-column]')).toHaveLength(4)
    expect(screen.getAllByText('Aug 31').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sep 7').length).toBeGreaterThan(0)
  })

  it('labels the month zoom columns with month names under a year group', () => {
    const { container } = renderGantt({ zoom: 'month' })

    expect(container.querySelectorAll('[data-gantt-column]')).toHaveLength(2)
    expect(screen.getAllByText('2026').length).toBeGreaterThan(0)
    expect(screen.queryByText('Sep 2026')).toBeNull()
  })

  it('reports the chosen zoom through onZoomChange', () => {
    const { onZoomChange } = renderGantt({ zoom: 'day' })

    fireEvent.click(screen.getByRole('button', { name: 'Week' }))

    expect(onZoomChange).toHaveBeenCalledTimes(1)
    expect(onZoomChange).toHaveBeenCalledWith('week')
  })

  it('moves a bar one day forward with the right arrow key', () => {
    const { onReschedule } = renderGantt()

    fireEvent.keyDown(barFor('row-item-1'), { key: 'ArrowRight' })

    expect(onReschedule).toHaveBeenCalledTimes(1)
    expect(onReschedule).toHaveBeenCalledWith({
      issueId: 'iss_1',
      plannedStart: day(0) + DAY,
      plannedFinish: day(4) + DAY,
    })
  })

  it('moves a bar one day back with the left arrow key', () => {
    const { onReschedule } = renderGantt()

    fireEvent.keyDown(barFor('row-item-1'), { key: 'ArrowLeft' })

    expect(onReschedule).toHaveBeenCalledWith({
      issueId: 'iss_1',
      plannedStart: day(0) - DAY,
      plannedFinish: day(4) - DAY,
    })
  })

  it('resizes a bar end with shift and an arrow key', () => {
    const { onReschedule } = renderGantt()

    fireEvent.keyDown(barFor('row-item-1'), {
      key: 'ArrowRight',
      shiftKey: true,
    })

    expect(onReschedule).toHaveBeenCalledWith({
      issueId: 'iss_1',
      plannedStart: day(0),
      plannedFinish: day(4) + DAY,
    })
  })

  it('moves a bar one week at week zoom', () => {
    const { onReschedule } = renderGantt({ zoom: 'week' })

    fireEvent.keyDown(barFor('row-item-1'), { key: 'ArrowRight' })

    expect(onReschedule).toHaveBeenCalledWith({
      issueId: 'iss_1',
      plannedStart: day(0) + DAY * 7,
      plannedFinish: day(4) + DAY * 7,
    })
  })

  it('reschedules once when a bar is dragged two grid units', () => {
    const { onReschedule } = renderGantt()
    const bar = barFor('row-item-1')

    fireEvent.pointerDown(bar, { clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 160 })
    fireEvent.pointerUp(window, { clientX: 160 })

    expect(onReschedule).toHaveBeenCalledTimes(1)
    expect(onReschedule).toHaveBeenCalledWith({
      issueId: 'iss_1',
      plannedStart: day(0) + DAY * 2,
      plannedFinish: day(4) + DAY * 2,
    })
  })

  it('resizes from the right edge handle without moving the start', () => {
    const { onReschedule } = renderGantt()
    const handle = document.querySelector('[data-gantt-resize="row-item-1"]')
    if (!handle) throw new Error('Missing resize handle')

    fireEvent.pointerDown(handle, { clientX: 200 })
    fireEvent.pointerUp(window, { clientX: 230 })

    expect(onReschedule).toHaveBeenCalledTimes(1)
    expect(onReschedule).toHaveBeenCalledWith({
      issueId: 'iss_1',
      plannedStart: day(0),
      plannedFinish: day(4) + DAY,
    })
  })

  it('does not reschedule when a drag ends where it started', () => {
    const { onReschedule } = renderGantt()

    fireEvent.pointerDown(barFor('row-item-1'), { clientX: 100 })
    fireEvent.pointerUp(window, { clientX: 100 })

    expect(onReschedule).not.toHaveBeenCalled()
  })

  it('renders no drag handles when the viewer cannot edit', () => {
    const { container } = renderGantt({ canEdit: false })

    expect(container.querySelectorAll('[data-gantt-resize]')).toHaveLength(0)
    expect(barFor('row-item-1')).toHaveAttribute('role', 'img')
    expect(
      screen.getByRole('img', { name: /Interview customers, planned/ })
    ).toBeInTheDocument()
  })

  it('ignores arrow keys when the viewer cannot edit', () => {
    const { onReschedule } = renderGantt({ canEdit: false })

    fireEvent.keyDown(barFor('row-item-1'), { key: 'ArrowRight' })

    expect(onReschedule).not.toHaveBeenCalled()
  })

  it('renders an empty state when the gantt has no rows', () => {
    renderGantt({
      gantt: makeGantt({ rows: [], edges: [], criticalIssueIds: [] }),
    })

    expect(
      screen.getByText(/No work items to schedule yet/)
    ).toBeInTheDocument()
  })

  it('explains that no planned dates exist when nothing is scheduled', () => {
    const { container } = renderGantt({
      gantt: makeGantt({
        rows: [row({ id: 'row-unscheduled', name: 'Unscheduled work' })],
        edges: [],
        criticalIssueIds: [],
        range: { start: null, end: null },
      }),
    })

    expect(container.querySelectorAll('[data-gantt-bar]')).toHaveLength(0)
    expect(screen.getByText(/has planned dates yet/)).toBeInTheDocument()
  })

  it('scrolls the grid horizontally rather than the page', () => {
    const { container } = renderGantt()
    const grid = container.querySelector('[data-gantt-grid]')

    expect(grid).not.toBeNull()
    expect(grid?.className).toContain('overflow-x-auto')
  })
})
