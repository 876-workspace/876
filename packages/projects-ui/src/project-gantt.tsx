'use client'

import { cn } from '@876/core/utils'
import type { Gantt, GanttRow, GanttZoom } from '@876/projects/contracts'
import { ChevronDown, ChevronRight } from '@876/ui/icons'
import Link from 'next/link'
import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

export type GanttReschedule = {
  issueId: string
  plannedStart: number
  plannedFinish: number
}

export type ProjectGanttProps = {
  gantt: Gantt
  issuesBaseHref: string
  zoom: GanttZoom
  onZoomChange: (zoom: GanttZoom) => void
  onReschedule: (change: GanttReschedule) => void
  canEdit: boolean
}

/** Zoom scales: pixel density, and the grid unit a drag or arrow key moves. */
const ZOOM_SCALES: Record<
  GanttZoom,
  { pxPerDay: number; unitDays: number; unitLabel: string }
> = {
  day: { pxPerDay: 30, unitDays: 1, unitLabel: 'day' },
  week: { pxPerDay: 14, unitDays: 7, unitLabel: 'week' },
  month: { pxPerDay: 4, unitDays: 30, unitLabel: 'month' },
}

const ZOOM_ORDER: readonly GanttZoom[] = ['day', 'week', 'month']

const ZOOM_LABELS: Record<GanttZoom, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const DAY_SECONDS = 86400
const WEEK_SECONDS = DAY_SECONDS * 7
const ROW_HEIGHT = 36
const HEADER_HEIGHT = 32
const MIN_BAR_WIDTH = 8
const CONNECTOR_GAP = 10

type TimelineColumn = {
  key: string
  width: number
  label: string
  group: string
}

type Timeline = {
  columns: TimelineColumn[]
  start: number
  width: number
  pxPerDay: number
  unitSeconds: number
}

type PlannedRange = { start: number; finish: number }

type BarOrigin = PlannedRange & { issueId: string }

type DragState = BarOrigin & { rowId: string }

type TreeRow = { row: GanttRow; depth: number }

type Tree = { rows: TreeRow[]; parents: ReadonlySet<string> }

function dayStart(seconds: number): number {
  return Math.floor(seconds / DAY_SECONDS) * DAY_SECONDS
}

function weekStart(seconds: number): number {
  const weekday = (new Date(dayStart(seconds) * 1000).getUTCDay() + 6) % 7
  return dayStart(seconds) - weekday * DAY_SECONDS
}

function monthStart(seconds: number): number {
  const date = new Date(seconds * 1000)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000
}

function addMonth(seconds: number): number {
  const date = new Date(seconds * 1000)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / 1000
}

function previousMonthStart(seconds: number): number {
  const date = new Date(seconds * 1000)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1) / 1000
}

function formatShortDate(seconds: number): string {
  const date = new Date(seconds * 1000)
  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCDate()}`
}

function formatFullDate(seconds: number): string {
  const date = new Date(seconds * 1000)
  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

function formatMonth(seconds: number): string {
  const date = new Date(seconds * 1000)
  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** Scheduled bounds, read in UTC so the server and the browser agree. */
function dateBounds(gantt: Gantt): { earliest: number; latest: number } | null {
  let earliest = Number.POSITIVE_INFINITY
  let latest = Number.NEGATIVE_INFINITY
  const consider = (value: number | null) => {
    if (value === null) return
    if (value < earliest) earliest = value
    if (value > latest) latest = value
  }

  for (const row of gantt.rows) {
    consider(row.plannedStart)
    consider(row.plannedFinish)
    consider(row.actualStart)
    consider(row.actualFinish)
  }
  consider(gantt.range.start)
  consider(gantt.range.end)

  if (earliest > latest) return null
  return { earliest: dayStart(earliest), latest: dayStart(latest) }
}

function buildTimeline(gantt: Gantt, zoom: GanttZoom): Timeline | null {
  const scale = ZOOM_SCALES[zoom]
  const bounds = dateBounds(gantt)
  if (!bounds) return null

  const { earliest, latest } = bounds
  const columns: TimelineColumn[] = []

  if (zoom === 'day') {
    const start = earliest - DAY_SECONDS * 2
    const end = latest + DAY_SECONDS * 3
    for (let cursor = start; cursor < end; cursor += DAY_SECONDS) {
      const date = new Date(cursor * 1000)
      columns.push({
        key: `day-${cursor}`,
        width: scale.pxPerDay,
        label: String(date.getUTCDate()),
        group: formatMonth(cursor),
      })
    }
    return {
      columns,
      start,
      width: columns.length * scale.pxPerDay,
      pxPerDay: scale.pxPerDay,
      unitSeconds: scale.unitDays * DAY_SECONDS,
    }
  }

  if (zoom === 'week') {
    const start = weekStart(earliest) - WEEK_SECONDS
    const end = weekStart(latest) + WEEK_SECONDS * 2
    for (let cursor = start; cursor < end; cursor += WEEK_SECONDS) {
      columns.push({
        key: `week-${cursor}`,
        width: scale.pxPerDay * 7,
        label: formatShortDate(cursor),
        group: formatMonth(cursor),
      })
    }
    return {
      columns,
      start,
      width: columns.length * scale.pxPerDay * 7,
      pxPerDay: scale.pxPerDay,
      unitSeconds: scale.unitDays * DAY_SECONDS,
    }
  }

  const start = previousMonthStart(monthStart(earliest))
  const end = addMonth(monthStart(latest))
  for (let cursor = start; cursor < end; cursor = addMonth(cursor)) {
    const next = addMonth(cursor)
    const days = (next - cursor) / DAY_SECONDS
    columns.push({
      key: `month-${cursor}`,
      width: days * scale.pxPerDay,
      label: MONTH_LABELS[new Date(cursor * 1000).getUTCMonth()],
      group: String(new Date(cursor * 1000).getUTCFullYear()),
    })
  }
  return {
    columns,
    start,
    width: columns.reduce((total, column) => total + column.width, 0),
    pxPerDay: scale.pxPerDay,
    unitSeconds: scale.unitDays * DAY_SECONDS,
  }
}

function xFor(seconds: number, timeline: Timeline): number {
  return ((seconds - timeline.start) / DAY_SECONDS) * timeline.pxPerDay
}

function secondsForDeltaX(deltaX: number, zoom: GanttZoom): number {
  const scale = ZOOM_SCALES[zoom]
  const units = Math.round(deltaX / (scale.pxPerDay * scale.unitDays))
  return units * scale.unitDays * DAY_SECONDS
}

function buildTree(
  rows: readonly GanttRow[],
  collapsed: ReadonlySet<string>
): Tree {
  const known = new Set(rows.map((row) => row.id))
  const byParent = new Map<string | null, GanttRow[]>()
  const parents = new Set<string>()

  for (const row of rows) {
    const parent =
      row.parentRowId !== null && known.has(row.parentRowId)
        ? row.parentRowId
        : null
    if (parent !== null) parents.add(parent)
    const bucket = byParent.get(parent)
    if (bucket) bucket.push(row)
    else byParent.set(parent, [row])
  }

  const ordered: TreeRow[] = []
  const visit = (parent: string | null, depth: number) => {
    for (const row of byParent.get(parent) ?? []) {
      ordered.push({ row, depth })
      if (!collapsed.has(row.id)) visit(row.id, depth + 1)
    }
  }
  visit(null, 0)

  return { rows: ordered, parents }
}

/** Planned dates drive the summary bar even when the row has no work item. */
function plannedRange(row: GanttRow): PlannedRange | null {
  if (row.plannedStart === null || row.plannedFinish === null) return null
  return {
    start: Math.min(row.plannedStart, row.plannedFinish),
    finish: Math.max(row.plannedStart, row.plannedFinish),
  }
}

/** Only a row that owns a work item can be dragged or resized. */
function barOrigin(row: GanttRow): BarOrigin | null {
  if (!row.issueId) return null
  const range = plannedRange(row)
  return range ? { issueId: row.issueId, ...range } : null
}

function actualRange(row: GanttRow): { start: number; finish: number } | null {
  if (row.actualStart === null && row.actualFinish === null) return null
  const start = row.actualStart ?? row.actualFinish
  const finish = row.actualFinish ?? row.actualStart
  if (start === null || finish === null) return null
  return { start: Math.min(start, finish), finish: Math.max(start, finish) }
}

function percent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function ProjectGantt({
  gantt,
  issuesBaseHref,
  zoom,
  onZoomChange,
  onReschedule,
  canEdit,
}: ProjectGanttProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  )
  const [drag, setDrag] = useState<DragState | null>(null)
  const markerId = useId().replace(/[^A-Za-z0-9_-]/g, '')

  const timeline = useMemo(() => buildTimeline(gantt, zoom), [gantt, zoom])
  const tree = useMemo(
    () => buildTree(gantt.rows, collapsed),
    [gantt.rows, collapsed]
  )
  const criticalIds = useMemo(
    () => new Set(gantt.criticalIssueIds),
    [gantt.criticalIssueIds]
  )

  function toggleRow(rowId: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  function commit(origin: BarOrigin, next: BarOrigin) {
    if (next.start === origin.start && next.finish === origin.finish) return
    onReschedule({
      issueId: origin.issueId,
      plannedStart: next.start,
      plannedFinish: next.finish,
    })
  }

  function beginDrag(
    event: ReactPointerEvent<HTMLElement>,
    row: GanttRow,
    origin: BarOrigin,
    mode: 'move' | 'resize'
  ) {
    if (!canEdit) return
    event.preventDefault()
    event.stopPropagation()

    const originX = event.clientX
    const project = (deltaSeconds: number): BarOrigin => {
      if (mode === 'move')
        return {
          issueId: origin.issueId,
          start: origin.start + deltaSeconds,
          finish: origin.finish + deltaSeconds,
        }
      const finish = Math.max(origin.start, origin.finish + deltaSeconds)
      return { issueId: origin.issueId, start: origin.start, finish }
    }

    setDrag({ rowId: row.id, ...project(0) })

    function stop() {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
    function onPointerMove(moveEvent: PointerEvent) {
      const next = project(secondsForDeltaX(moveEvent.clientX - originX, zoom))
      setDrag({ rowId: row.id, ...next })
    }
    function onPointerUp(upEvent: PointerEvent) {
      stop()
      setDrag(null)
      commit(origin, project(secondsForDeltaX(upEvent.clientX - originX, zoom)))
    }
    function onPointerCancel() {
      stop()
      setDrag(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  function handleBarKeyDown(
    event: ReactKeyboardEvent<HTMLElement>,
    origin: BarOrigin
  ) {
    if (!canEdit) return
    const step =
      event.key === 'ArrowRight'
        ? timeline?.unitSeconds
        : event.key === 'ArrowLeft'
          ? -(timeline?.unitSeconds ?? 0)
          : 0
    if (!step) return
    event.preventDefault()

    if (event.shiftKey) {
      commit(origin, {
        issueId: origin.issueId,
        start: origin.start,
        finish: Math.max(origin.start, origin.finish + step),
      })
      return
    }

    commit(origin, {
      issueId: origin.issueId,
      start: origin.start + step,
      finish: origin.finish + step,
    })
  }

  function barLabel(
    row: GanttRow,
    range: PlannedRange,
    critical: boolean,
    interactive: boolean
  ): string {
    const planned = `planned ${formatFullDate(range.start)} to ${formatFullDate(range.finish)}`
    const suffix = critical ? ', on the critical path' : ''
    if (!interactive) return `${row.name}, ${planned}${suffix}`
    return `${row.name}, ${planned}${suffix}. Arrow keys move one ${ZOOM_SCALES[zoom].unitLabel}, shift plus arrow keys resize.`
  }

  const connectors = useMemo(() => {
    if (!timeline) return []
    const seat = new Map<string, { index: number; x: number; endX: number }>()
    tree.rows.forEach(({ row }, index) => {
      const origin = barOrigin(row)
      if (!row.issueId || !origin) return
      seat.set(row.issueId, {
        index,
        x: xFor(origin.start, timeline),
        endX: xFor(origin.finish, timeline),
      })
    })

    return gantt.edges.flatMap((edge) => {
      const from = seat.get(edge.predecessorIssueId)
      const to = seat.get(edge.successorIssueId)
      if (!from || !to) return []
      const y1 = from.index * ROW_HEIGHT + ROW_HEIGHT / 2
      const y2 = to.index * ROW_HEIGHT + ROW_HEIGHT / 2
      const bend = Math.max(from.endX + CONNECTOR_GAP, 0)
      const d = `M ${from.endX} ${y1} H ${bend} V ${y2} H ${to.x - CONNECTOR_GAP}`
      return [{ id: edge.id, d }]
    })
  }, [gantt.edges, timeline, tree.rows])

  if (gantt.rows.length === 0)
    return (
      <section className="876-card p-5">
        <h2 className="876-page-title">Timeline</h2>
        <p className="text-muted-foreground mt-3 text-sm">
          No work items to schedule yet. Add work items to this project to plan
          a timeline.
        </p>
      </section>
    )

  return (
    <section className="876-card overflow-hidden">
      <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="876-page-title">Timeline</h2>
        <div
          role="group"
          aria-label="Timeline zoom"
          className="bg-muted flex items-center gap-1 rounded-lg p-[3px]"
        >
          {ZOOM_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === zoom}
              onClick={() => onZoomChange(option)}
              className={cn(
                'rounded-md px-3 py-1 text-[0.8125rem] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                option === zoom
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {ZOOM_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex">
        <div className="border-border/60 w-40 shrink-0 border-r sm:w-64">
          <div
            className="text-muted-foreground border-border/60 flex items-center border-b px-3 text-xs font-medium"
            style={{ height: HEADER_HEIGHT }}
          >
            Work item
          </div>
          {tree.rows.map(({ row, depth }) => {
            const critical =
              row.isCritical ||
              (row.issueId !== null && criticalIds.has(row.issueId))
            const hasChildren = tree.parents.has(row.id)
            const isCollapsed = collapsed.has(row.id)

            return (
              <div
                key={row.id}
                data-gantt-row={row.id}
                className="border-border/60 flex items-center gap-1.5 border-b pr-2"
                style={{
                  height: ROW_HEIGHT,
                  paddingLeft: 8 + depth * 14,
                }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${row.name}`}
                    onClick={() => toggleRow(row.id)}
                    className="text-muted-foreground hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {isCollapsed ? (
                      <ChevronRight aria-hidden="true" className="size-3.5" />
                    ) : (
                      <ChevronDown aria-hidden="true" className="size-3.5" />
                    )}
                  </button>
                ) : (
                  <span aria-hidden="true" className="size-5 shrink-0" />
                )}

                {row.issueId ? (
                  <Link
                    href={`${issuesBaseHref}/${encodeURIComponent(row.issueId)}`}
                    title={row.name}
                    className="min-w-0 flex-1 truncate text-[0.8125rem] hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {row.name}
                  </Link>
                ) : (
                  <span
                    title={row.name}
                    className={cn(
                      'min-w-0 flex-1 truncate text-[0.8125rem]',
                      row.kind === 'phase' && 'font-semibold'
                    )}
                  >
                    {row.name}
                  </span>
                )}

                {critical ? (
                  <span className="bg-destructive/15 text-destructive shrink-0 rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold">
                    Critical path
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>

        <div data-gantt-grid className="min-w-0 flex-1 overflow-x-auto">
          {timeline ? (
            <div style={{ width: timeline.width }}>
              <div
                aria-hidden="true"
                className="border-border/60 flex border-b"
                style={{ height: HEADER_HEIGHT }}
              >
                {timeline.columns.map((column) => (
                  <div
                    key={column.key}
                    data-gantt-column
                    className="border-border/40 flex shrink-0 flex-col justify-center border-r"
                    style={{ width: column.width }}
                  >
                    <span className="text-muted-foreground h-4 overflow-hidden px-1 text-[0.625rem] leading-4 whitespace-nowrap">
                      {column.group}
                    </span>
                    <span className="text-foreground h-4 px-1 text-[0.6875rem] leading-4">
                      {column.label}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="relative"
                style={{ height: tree.rows.length * ROW_HEIGHT }}
              >
                {tree.rows.map(({ row }) => {
                  const origin = barOrigin(row)
                  const planned = plannedRange(row)
                  const actual = actualRange(row)
                  const critical =
                    row.isCritical ||
                    (row.issueId !== null && criticalIds.has(row.issueId))
                  const preview =
                    drag && drag.rowId === row.id
                      ? { start: drag.start, finish: drag.finish }
                      : null
                  const range = preview ?? planned
                  const interactive = canEdit && origin !== null

                  return (
                    <div
                      key={row.id}
                      className="border-border/60 relative border-b"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {actual ? (
                        <span
                          data-gantt-actual={row.id}
                          aria-hidden="true"
                          className="border-primary/40 bg-primary/20 absolute top-1 h-1.5 rounded-full border"
                          style={{
                            left: xFor(actual.start, timeline),
                            width: Math.max(
                              MIN_BAR_WIDTH,
                              xFor(actual.finish, timeline) -
                                xFor(actual.start, timeline)
                            ),
                          }}
                        />
                      ) : null}

                      {range ? (
                        <div
                          data-gantt-bar={row.id}
                          data-critical={critical ? 'true' : undefined}
                          role={interactive ? 'button' : 'img'}
                          tabIndex={interactive ? 0 : undefined}
                          aria-label={barLabel(
                            row,
                            range,
                            critical,
                            interactive
                          )}
                          onPointerDown={
                            interactive && origin
                              ? (event) => beginDrag(event, row, origin, 'move')
                              : undefined
                          }
                          onKeyDown={
                            interactive && origin
                              ? (event) => handleBarKeyDown(event, origin)
                              : undefined
                          }
                          className={cn(
                            'absolute top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full border',
                            critical
                              ? 'border-destructive/60 bg-destructive/15'
                              : 'border-primary/40 bg-primary/15',
                            interactive &&
                              'cursor-grab touch-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none active:cursor-grabbing'
                          )}
                          style={{
                            left: xFor(range.start, timeline),
                            width: Math.max(
                              MIN_BAR_WIDTH,
                              xFor(range.finish, timeline) -
                                xFor(range.start, timeline)
                            ),
                          }}
                        >
                          <span
                            data-gantt-progress={row.id}
                            aria-hidden="true"
                            className={cn(
                              'block h-full rounded-full',
                              critical ? 'bg-destructive/70' : 'bg-primary/70'
                            )}
                            style={{
                              width: `${percent(row.percentComplete)}%`,
                            }}
                          />
                          {interactive && !preview ? (
                            <span
                              data-gantt-resize={row.id}
                              aria-hidden="true"
                              onPointerDown={(event) => {
                                if (!origin) return
                                beginDrag(event, row, origin, 'resize')
                              }}
                              className="bg-background/70 hover:bg-background absolute inset-y-0 right-0 w-2 cursor-ew-resize"
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })}

                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-20"
                  width={timeline.width}
                  height={tree.rows.length * ROW_HEIGHT}
                >
                  <defs>
                    <marker
                      id={markerId}
                      markerWidth="6"
                      markerHeight="6"
                      refX="5"
                      refY="3"
                      orient="auto"
                    >
                      <path
                        d="M0,0 L6,3 L0,6 Z"
                        className="fill-foreground/50"
                      />
                    </marker>
                  </defs>
                  {connectors.map((connector) => (
                    <path
                      key={connector.id}
                      data-gantt-connector={connector.id}
                      d={connector.d}
                      fill="none"
                      strokeWidth={1.5}
                      markerEnd={`url(#${markerId})`}
                      className="stroke-foreground/40"
                    />
                  ))}
                </svg>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground px-4 py-6 text-sm">
              No work item has planned dates yet. Set a planned start and finish
              on a work item to see it here.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
