/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  issuesClient: { update: mocks.update },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

const { IssueStatusSelect } = await import('./issue-status-select')

const STATUSES = [
  { key: 'todo', label: 'To do' },
  { key: 'done', label: 'Done' },
]

function renderSelect() {
  return render(
    <IssueStatusSelect
      issueRef="PROJ-1"
      currentStatus="todo"
      statuses={STATUSES}
      canEdit
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.update.mockResolvedValue({
    data: { object: 'projects.issue', id: 'iss_1' },
    error: null,
  })
})

afterEach(cleanup)

describe('IssueStatusSelect', () => {
  it('renders nothing when the viewer cannot edit', () => {
    render(
      <IssueStatusSelect
        issueRef="PROJ-1"
        currentStatus="todo"
        statuses={STATUSES}
        canEdit={false}
      />
    )

    expect(
      document.querySelector('[data-slot="issue-status-select"]')
    ).not.toBeInTheDocument()
  })

  it('sends the new status to the issue route', async () => {
    renderSelect()

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'done' },
    })

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith('PROJ-1', { status: 'done' })
    )
  })

  it('shows an AppError and a comment field when a comment is required', async () => {
    renderSelect()
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/transition-requirements-unmet',
        message: 'This transition requires a comment.',
      },
    })

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'done' },
    })

    expect(
      await screen.findByText('Status not changed')
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Comment (required by this transition)')
    ).toBeInTheDocument()
  })

  it('retries with the comment once one is entered', async () => {
    renderSelect()
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/transition-requirements-unmet',
        message: 'This transition requires a comment.',
      },
    })

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'done' },
    })
    const comment = await screen.findByLabelText(
      'Comment (required by this transition)'
    )
    fireEvent.change(comment, { target: { value: 'Verified on staging' } })
    fireEvent.click(screen.getByRole('button', { name: 'Retry with comment' }))

    expect(mocks.update).toHaveBeenLastCalledWith('PROJ-1', {
      status: 'done',
      comment: 'Verified on staging',
    })
  })

  it('names a disallowed transition without offering a comment retry', async () => {
    renderSelect()
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/transition-not-allowed',
        message: 'This state change is not allowed by the blueprint.',
      },
    })

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'done' },
    })

    expect(
      await screen.findByText('Status change not allowed')
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Comment (required by this transition)')
    ).not.toBeInTheDocument()
  })
})
