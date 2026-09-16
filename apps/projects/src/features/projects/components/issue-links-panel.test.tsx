/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createRelation: vi.fn(),
  removeRelation: vi.fn(),
  createDependency: vi.fn(),
  updateDependency: vi.fn(),
  removeDependency: vi.fn(),
  suggestSchedule: vi.fn(),
  updateIssue: vi.fn(),
  searchIssues: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client/issue-links', () => ({
  issueLinksClient: {
    relations: {
      create: mocks.createRelation,
      delete: mocks.removeRelation,
    },
    dependencies: {
      create: mocks.createDependency,
      update: mocks.updateDependency,
      delete: mocks.removeDependency,
      suggestSchedule: mocks.suggestSchedule,
    },
  },
}))
vi.mock('@/lib/client', () => ({
  issuesClient: { update: mocks.updateIssue, search: mocks.searchIssues },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import {
  IssueLinksPanel,
  type DependencyLink,
  type RelationLink,
  type WorkItemOption,
} from './issue-links-panel'

const release: WorkItemOption = {
  id: 'iss_1',
  identifier: 'CONSOLE-1',
  title: 'Ship the release',
}
const migration: WorkItemOption = {
  id: 'iss_3',
  identifier: 'CONSOLE-3',
  title: 'Write the migration',
}
const unrelated: WorkItemOption = {
  id: 'iss_9',
  identifier: 'CONSOLE-9',
  title: 'Unrelated work',
}
const relations: RelationLink[] = [
  { id: 'isr_1', type: 'relates-to', direction: 'outgoing', item: release },
]
const dependencies: DependencyLink[] = [
  {
    id: 'isd_1',
    role: 'predecessor',
    type: 'finish-to-start',
    lagMinutes: 60,
    item: migration,
  },
  {
    id: 'isd_2',
    role: 'successor',
    type: 'start-to-start',
    lagMinutes: -30,
    item: release,
  },
]

function timestamp(date: string) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000)
}

function renderPanel(
  overrides: Partial<Parameters<typeof IssueLinksPanel>[0]> = {}
) {
  return render(
    <IssueLinksPanel
      issueRef="CONSOLE-2"
      issueId="iss_2"
      projectId="prj_1"
      relations={relations}
      dependencies={dependencies}
      plannedStartDate={null}
      plannedFinishDate={null}
      plannedDurationMinutes={null}
      {...overrides}
    />
  )
}

/**
 * Types a query, waits out the debounce, and picks the item the search returned.
 * Mirrors what a user does: the picker holds only what the server answered.
 */
async function pickWorkItem(input: {
  queryLabel: string
  targetLabel: string
  query: string
  option: WorkItemOption
}) {
  mocks.searchIssues.mockResolvedValue({ data: [input.option], error: null })

  fireEvent.change(screen.getByLabelText(input.queryLabel), {
    target: { value: input.query },
  })

  await screen.findByRole('option', {
    name: `${input.option.identifier} · ${input.option.title}`,
  })
  fireEvent.change(screen.getByLabelText(input.targetLabel), {
    target: { value: input.option.id },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createRelation.mockResolvedValue({ data: null, error: null })
  mocks.removeRelation.mockResolvedValue({ data: null, error: null })
  mocks.createDependency.mockResolvedValue({ data: null, error: null })
  mocks.updateDependency.mockResolvedValue({ data: null, error: null })
  mocks.removeDependency.mockResolvedValue({ data: null, error: null })
  mocks.updateIssue.mockResolvedValue({ data: null, error: null })
  mocks.searchIssues.mockResolvedValue({ data: [], error: null })
})

describe('IssueLinksPanel', () => {
  it('renders both link sections', () => {
    renderPanel()

    expect(
      screen.getByRole('heading', { name: 'Relationships' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Dependencies' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Predecessors' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Successors' })
    ).toBeInTheDocument()
  })

  it('lists each relationship against a link to the other work item', () => {
    renderPanel()

    const relationships = screen.getByRole('list', { name: 'Relationships' })
    expect(within(relationships).getByText('relates to')).toBeInTheDocument()
    const link = within(relationships).getByRole('link', { name: 'CONSOLE-1' })
    expect(link).toHaveAttribute('href', '/issues/CONSOLE-1')
    expect(
      within(relationships).getByText('Ship the release')
    ).toBeInTheDocument()
  })

  it('reads a blocks relationship from the receiving side as blocked by', () => {
    renderPanel({
      relations: [
        { id: 'isr_1', type: 'blocks', direction: 'outgoing', item: release },
        {
          id: 'isr_2',
          type: 'blocks',
          direction: 'incoming',
          item: migration,
        },
      ],
    })

    const relationships = screen.getByRole('list', { name: 'Relationships' })
    expect(within(relationships).getByText('blocks')).toBeInTheDocument()
    expect(within(relationships).getByText('blocked by')).toBeInTheDocument()
  })

  it('shows predecessors and successors with their type and lag', () => {
    renderPanel()

    const predecessors = screen.getByRole('list', { name: 'Predecessors' })
    expect(
      within(predecessors).getByText('finish to start · 60 minutes lag')
    ).toBeInTheDocument()
    const successors = screen.getByRole('list', { name: 'Successors' })
    expect(
      within(successors).getByText('start to start · 30 minutes lead')
    ).toBeInTheDocument()
  })

  it('removes a relationship once with the id it was given', async () => {
    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove relationship CONSOLE-1' })
    )

    await waitFor(() =>
      expect(mocks.removeRelation).toHaveBeenCalledWith('CONSOLE-2', 'isr_1')
    )
    expect(mocks.removeRelation).toHaveBeenCalledTimes(1)
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('removes a dependency once with the id it was given', async () => {
    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove dependency CONSOLE-3' })
    )

    await waitFor(() =>
      expect(mocks.removeDependency).toHaveBeenCalledWith('CONSOLE-2', 'isd_1')
    )
    expect(mocks.removeDependency).toHaveBeenCalledTimes(1)
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('adds a relationship of the chosen type to the picked work item', async () => {
    renderPanel()

    fireEvent.change(screen.getByLabelText('Relationship type'), {
      target: { value: 'blocks' },
    })
    await pickWorkItem({
      queryLabel: 'Search work items',
      targetLabel: 'Related work item',
      query: 'release',
      option: release,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add relationship' }))

    await waitFor(() =>
      expect(mocks.createRelation).toHaveBeenCalledWith('CONSOLE-2', {
        targetIssueId: 'iss_1',
        type: 'blocks',
      })
    )
    expect(mocks.createRelation).toHaveBeenCalledTimes(1)
  })

  it('adds a predecessor dependency that waits on the linked work item', async () => {
    renderPanel()

    await pickWorkItem({
      queryLabel: 'Search dependencies',
      targetLabel: 'Dependency work item',
      query: 'migration',
      option: migration,
    })
    fireEvent.change(screen.getByLabelText('Dependency type'), {
      target: { value: 'finish-to-finish' },
    })
    fireEvent.change(screen.getByLabelText('Lag minutes'), {
      target: { value: '120' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add dependency' }))

    await waitFor(() =>
      expect(mocks.createDependency).toHaveBeenCalledWith('CONSOLE-2', {
        predecessorIssueId: 'iss_3',
        successorIssueId: 'iss_2',
        type: 'finish-to-finish',
        lagMinutes: 120,
      })
    )
  })

  it('adds a successor dependency that this work item precedes', async () => {
    renderPanel()

    fireEvent.change(screen.getByLabelText('Dependency role'), {
      target: { value: 'successor' },
    })
    await pickWorkItem({
      queryLabel: 'Search dependencies',
      targetLabel: 'Dependency work item',
      query: 'release',
      option: release,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add dependency' }))

    await waitFor(() =>
      expect(mocks.createDependency).toHaveBeenCalledWith('CONSOLE-2', {
        predecessorIssueId: 'iss_2',
        successorIssueId: 'iss_1',
        type: 'finish-to-start',
        lagMinutes: 0,
      })
    )
  })

  it('edits the type and lag of an existing dependency', async () => {
    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit dependency CONSOLE-3' })
    )
    fireEvent.change(screen.getByLabelText('CONSOLE-3 type'), {
      target: { value: 'start-to-finish' },
    })
    fireEvent.change(screen.getByLabelText('CONSOLE-3 lag minutes'), {
      target: { value: '45' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Save dependency CONSOLE-3' })
    )

    await waitFor(() =>
      expect(mocks.updateDependency).toHaveBeenCalledWith(
        'CONSOLE-2',
        'isd_1',
        {
          type: 'start-to-finish',
          lagMinutes: 45,
        }
      )
    )
  })

  it('fills the planned inputs from the suggestion without saving', async () => {
    mocks.suggestSchedule.mockResolvedValue({
      data: {
        earliestStart: timestamp('2026-09-06'),
        earliestFinish: timestamp('2026-09-10'),
        constrainedBy: [
          {
            issueId: 'iss_3',
            identifier: 'CONSOLE-3',
            type: 'finish-to-start',
            lagMinutes: 60,
          },
        ],
      },
      error: null,
    })

    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: 'Suggest from dependencies' })
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Planned start')).toHaveValue('2026-09-06')
    )
    expect(screen.getByLabelText('Planned finish')).toHaveValue('2026-09-10')
    expect(screen.getByText(/constrained by CONSOLE-3/)).toBeInTheDocument()
    expect(mocks.suggestSchedule).toHaveBeenCalledWith('CONSOLE-2')
    expect(mocks.updateIssue).not.toHaveBeenCalled()
  })

  it('saves the planned schedule through the issue update', async () => {
    renderPanel()

    fireEvent.change(screen.getByLabelText('Planned start'), {
      target: { value: '2026-09-20' },
    })
    fireEvent.change(screen.getByLabelText('Planned finish'), {
      target: { value: '2026-09-23' },
    })
    fireEvent.change(screen.getByLabelText('Planned duration (minutes)'), {
      target: { value: '480' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Save planned schedule' })
    )

    await waitFor(() =>
      expect(mocks.updateIssue).toHaveBeenCalledWith('CONSOLE-2', {
        plannedStartDate: timestamp('2026-09-20'),
        plannedFinishDate: timestamp('2026-09-23'),
        plannedDurationMinutes: 480,
      })
    )
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('shows the failure instead of filling the inputs when the suggestion fails', async () => {
    mocks.suggestSchedule.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-not-found',
        message: 'That work item does not exist.',
      },
    })

    renderPanel()

    fireEvent.click(
      screen.getByRole('button', { name: 'Suggest from dependencies' })
    )

    expect(
      await screen.findByText('Work item links not saved')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Planned start')).toHaveValue('')
    expect(mocks.updateIssue).not.toHaveBeenCalled()
  })

  it('seeds the planned inputs from the work item it was given', () => {
    renderPanel({
      plannedStartDate: timestamp('2026-09-06'),
      plannedFinishDate: timestamp('2026-09-10'),
      plannedDurationMinutes: 240,
    })

    expect(screen.getByLabelText('Planned start')).toHaveValue('2026-09-06')
    expect(screen.getByLabelText('Planned finish')).toHaveValue('2026-09-10')
    expect(screen.getByLabelText('Planned duration (minutes)')).toHaveValue(240)
  })
  describe('IssueLinksPanel work item search', () => {
    // The picker searches on the server, so what these assert is the timing of
    // the request and what the server answered — never a preloaded window.
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function settleDebounce() {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })
    }

    it('searches nothing until something is typed', async () => {
      renderPanel()

      await settleDebounce()

      expect(mocks.searchIssues).not.toHaveBeenCalled()
    })

    it('waits for the typing to settle before searching', async () => {
      renderPanel()

      fireEvent.change(screen.getByLabelText('Search work items'), {
        target: { value: 'mig' },
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(299)
      })

      expect(mocks.searchIssues).not.toHaveBeenCalled()

      await settleDebounce()

      expect(mocks.searchIssues).toHaveBeenCalledTimes(1)
      expect(mocks.searchIssues.mock.calls[0][0]).toEqual({
        q: 'mig',
        projectId: 'prj_1',
      })
    })

    it('debounces a burst of keystrokes into one search', async () => {
      renderPanel()

      const box = screen.getByLabelText('Search work items')
      fireEvent.change(box, { target: { value: 'mi' } })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      fireEvent.change(box, { target: { value: 'mig' } })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      fireEvent.change(box, { target: { value: 'migr' } })
      await settleDebounce()

      expect(mocks.searchIssues).toHaveBeenCalledTimes(1)
      expect(mocks.searchIssues.mock.calls[0][0]).toEqual({
        q: 'migr',
        projectId: 'prj_1',
      })
    })

    it('renders the work items the search returned', async () => {
      mocks.searchIssues.mockResolvedValue({ data: [migration], error: null })

      renderPanel()

      fireEvent.change(screen.getByLabelText('Search work items'), {
        target: { value: 'migration' },
      })
      await settleDebounce()

      expect(
        within(screen.getByLabelText('Related work item')).getByRole('option', {
          name: 'CONSOLE-3 · Write the migration',
        })
      ).toBeInTheDocument()
    })

    it('searches every project once the All projects toggle is on', async () => {
      mocks.searchIssues.mockResolvedValue({ data: [unrelated], error: null })

      renderPanel()

      fireEvent.click(screen.getByLabelText('All projects'))
      fireEvent.change(screen.getByLabelText('Search work items'), {
        target: { value: 'unrelated' },
      })
      await settleDebounce()

      expect(mocks.searchIssues.mock.calls[0][0]).toEqual({ q: 'unrelated' })
      expect(
        within(screen.getByLabelText('Related work item')).getByRole('option', {
          name: 'CONSOLE-9 · Unrelated work',
        })
      ).toBeInTheDocument()
    })

    it('says so instead of offering a stale list when the search fails', async () => {
      mocks.searchIssues.mockResolvedValue({
        data: null,
        error: {
          code: 'projects/search-unavailable',
          message: 'The search could not be run.',
        },
      })

      renderPanel()

      fireEvent.change(screen.getByLabelText('Search work items'), {
        target: { value: 'migration' },
      })
      await settleDebounce()

      expect(
        within(screen.getByLabelText('Related work item')).getByRole('option', {
          name: 'Search failed — try again',
        })
      ).toBeInTheDocument()
    })

    it('links the searched work item once when it is picked', async () => {
      mocks.searchIssues.mockResolvedValue({ data: [migration], error: null })

      renderPanel()

      fireEvent.change(screen.getByLabelText('Search work items'), {
        target: { value: 'migration' },
      })
      await settleDebounce()
      fireEvent.change(screen.getByLabelText('Related work item'), {
        target: { value: 'iss_3' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Add relationship' }))

      expect(mocks.createRelation).toHaveBeenCalledTimes(1)
      expect(mocks.createRelation).toHaveBeenCalledWith('CONSOLE-2', {
        targetIssueId: 'iss_3',
        type: 'relates-to',
      })
    })
  })
})
