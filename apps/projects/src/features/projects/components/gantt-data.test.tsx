import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import type {
  Baseline,
  BaselineComparison,
  Gantt,
} from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  listBaselines: vi.fn(),
  comparison: vi.fn(),
  resolveAccess: vi.fn(),
  requireContext: vi.fn(),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    gantt: { retrieve: mocks.retrieve },
    baselines: { list: mocks.listBaselines, comparison: mocks.comparison },
  },
}))
vi.mock('@/lib/auth/access-context', () => ({
  resolveAccessContext: mocks.resolveAccess,
  canAccess: (context: { permissions: string[] }, permission: string) =>
    context.permissions.includes(permission),
}))
vi.mock('@/lib/auth/require-projects-context', () => ({
  requireProjectsContext: mocks.requireContext,
}))
vi.mock('@/features/projects/components/gantt-view', () => ({
  GanttView: ({ canEdit }: { canEdit: boolean }) => (
    <div>Gantt canvas editable={String(canEdit)}</div>
  ),
}))
vi.mock('@/features/projects/components/gantt-baselines', () => ({
  GanttBaselines: ({
    comparison,
  }: {
    comparison: BaselineComparison | null
  }) => <div>Baselines section rows={comparison?.items.length ?? 0}</div>,
}))

import { GanttData } from './gantt-data'

function gantt(): Gantt {
  return {
    object: 'gantt',
    rows: [],
    edges: [],
    criticalIssueIds: [],
    range: { start: null, end: null },
  }
}

function baseline(overrides: Partial<Baseline> = {}): Baseline {
  return {
    object: 'projects.baseline',
    id: 'bsl_1',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    name: 'Kickoff plan',
    capturedBy: 'usr_1',
    capturedAt: 1788400000,
    note: null,
    itemCount: 2,
    ...overrides,
  }
}

function comparison(): BaselineComparison {
  return {
    object: 'baseline-comparison',
    baselineId: 'bsl_1',
    projectId: 'prj_1',
    items: [
      {
        object: 'baseline-comparison-item',
        issueId: 'iss_1',
        identifier: 'CONSOLE-1',
        baselineStart: 1788300000,
        baselineFinish: 1788400000,
        currentStart: 1788300000,
        currentFinish: 1788400000,
        startVarianceMinutes: 0,
        finishVarianceMinutes: 0,
      },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireContext.mockResolvedValue({ userId: 'usr_1', orgId: 'org_1' })
  mocks.retrieve.mockResolvedValue({ data: gantt(), error: null })
  mocks.listBaselines.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.comparison.mockResolvedValue({ data: comparison(), error: null })
  mocks.resolveAccess.mockResolvedValue({
    status: 'ok',
    context: { permissions: ['projects.view'] },
  })
})

describe('GanttData', () => {
  it('reads the gantt read model for the project', async () => {
    render(await GanttData({ orgId: 'org_1', projectId: 'prj_1' }))

    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'prj_1', {
      includeSubItems: true,
    })
    expect(screen.getByText(/Gantt canvas/)).toBeInTheDocument()
  })

  it('surfaces a timeline load failure as a banner and skips the canvas', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'projects/gantt-unavailable', message: 'No timeline.' },
    })

    render(await GanttData({ orgId: 'org_1', projectId: 'prj_1' }))

    expect(
      screen.getByText('The timeline could not be loaded')
    ).toBeInTheDocument()
    expect(screen.queryByText(/Gantt canvas/)).toBeNull()
  })

  it('grants editing when the viewer holds projects.edit', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      context: { permissions: ['projects.view', 'projects.edit'] },
    })

    render(await GanttData({ orgId: 'org_1', projectId: 'prj_1' }))

    expect(screen.getByText('Gantt canvas editable=true')).toBeInTheDocument()
  })

  it('withholds editing when the viewer only holds projects.view', async () => {
    render(await GanttData({ orgId: 'org_1', projectId: 'prj_1' }))

    expect(screen.getByText('Gantt canvas editable=false')).toBeInTheDocument()
  })

  it('compares against the requested baseline', async () => {
    mocks.listBaselines.mockResolvedValue({
      data: { data: [baseline(), baseline({ id: 'bsl_2', name: 'Week 2' })] },
      error: null,
    })

    render(
      await GanttData({
        orgId: 'org_1',
        projectId: 'prj_1',
        baselineId: 'bsl_2',
      })
    )

    expect(mocks.comparison).toHaveBeenCalledWith('org_1', 'prj_1', 'bsl_2')
    expect(screen.getByText('Baselines section rows=1')).toBeInTheDocument()
  })

  it('falls back to the newest baseline when none is requested', async () => {
    mocks.listBaselines.mockResolvedValue({
      data: { data: [baseline()] },
      error: null,
    })

    render(await GanttData({ orgId: 'org_1', projectId: 'prj_1' }))

    expect(mocks.comparison).toHaveBeenCalledWith('org_1', 'prj_1', 'bsl_1')
  })

  it('does not compare when the project has no baselines', async () => {
    render(await GanttData({ orgId: 'org_1', projectId: 'prj_1' }))

    expect(mocks.comparison).not.toHaveBeenCalled()
    expect(screen.getByText('Baselines section rows=0')).toBeInTheDocument()
  })

  it('reports a baseline list failure without dropping the timeline', async () => {
    mocks.listBaselines.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/baselines-unavailable',
        message: 'No baselines.',
      },
    })

    render(await GanttData({ orgId: 'org_1', projectId: 'prj_1' }))

    expect(
      screen.getByText('Some baseline data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText(/Gantt canvas/)).toBeInTheDocument()
  })
})
