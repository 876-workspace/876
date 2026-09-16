import type { Timesheet } from '@876/projects/contracts'
import type { TimesheetSummaryEntry } from '@876/projects-ui/timesheet-summary'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  submitTimesheet: vi.fn(),
  recallTimesheet: vi.fn(),
  approveTimesheet: vi.fn(),
  rejectTimesheet: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('@/lib/client/time', () => ({
  timeClient: {
    submitTimesheet: mocks.submitTimesheet,
    recallTimesheet: mocks.recallTimesheet,
    approveTimesheet: mocks.approveTimesheet,
    rejectTimesheet: mocks.rejectTimesheet,
  },
}))

const { TimesheetCard } = await import('./timesheet-card')

function timesheet(overrides: Partial<Timesheet> = {}): Timesheet {
  return {
    object: 'projects.timesheet',
    id: 'tsh_1',
    tenantId: 'tnt_1',
    userId: 'usr_1',
    periodStart: 1704067200,
    periodEnd: 1704671999,
    status: 'submitted',
    submittedAt: 1704700000,
    decidedAt: null,
    decidedBy: null,
    note: null,
    createdAt: 1704273300,
    updatedAt: 1704273300,
    ...overrides,
  }
}

const ENTRIES: TimesheetSummaryEntry[] = [
  {
    id: 'tme_1',
    startedAt: 1704273300,
    durationMinutes: 90,
    billable: true,
    projectId: 'prj_1',
    projectName: 'Website rebuild',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.submitTimesheet.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1' },
    error: null,
  })
  mocks.recallTimesheet.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1' },
    error: null,
  })
  mocks.approveTimesheet.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1' },
    error: null,
  })
  mocks.rejectTimesheet.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1' },
    error: null,
  })
})

describe('TimesheetCard', () => {
  it('shows what the sheet covers and who submitted it', () => {
    render(
      <TimesheetCard
        timesheet={timesheet()}
        entries={ENTRIES}
        isOwner
        canApprove={false}
        submittedBy="Ada Lovelace"
      />
    )

    expect(screen.getByText('Jan 1, 2024 – Jan 7, 2024')).toBeInTheDocument()
    expect(screen.getByText(/Submitted by Ada Lovelace/)).toBeInTheDocument()
    expect(screen.getByText('Website rebuild')).toBeInTheDocument()
    expect(screen.getByText('0m')).toBeInTheDocument()
  })

  it('lets the owner submit a draft', async () => {
    const user = userEvent.setup()
    render(
      <TimesheetCard
        timesheet={timesheet({ status: 'draft', submittedAt: null })}
        entries={ENTRIES}
        isOwner
        canApprove={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(mocks.submitTimesheet).toHaveBeenCalledWith('tsh_1')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('lets the owner recall a sheet that is awaiting a decision', async () => {
    const user = userEvent.setup()
    render(
      <TimesheetCard
        timesheet={timesheet()}
        entries={ENTRIES}
        isOwner
        canApprove={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Recall' }))

    expect(mocks.recallTimesheet).toHaveBeenCalledWith('tsh_1')
  })

  it('lets an approver decide someone else’s sheet', async () => {
    const user = userEvent.setup()
    render(
      <TimesheetCard
        timesheet={timesheet()}
        entries={ENTRIES}
        isOwner={false}
        canApprove
      />
    )

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(mocks.approveTimesheet).toHaveBeenCalledWith('tsh_1')
  })

  it('sends the reason the approver typed with a rejection', async () => {
    const user = userEvent.setup()
    render(
      <TimesheetCard
        timesheet={timesheet()}
        entries={ENTRIES}
        isOwner={false}
        canApprove
      />
    )

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await user.type(
      screen.getByLabelText('Rejection note'),
      'Wrong project charged'
    )
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    expect(mocks.rejectTimesheet).toHaveBeenCalledWith(
      'tsh_1',
      'Wrong project charged'
    )
  })

  it('lets the owner submit a rejected sheet again', async () => {
    const user = userEvent.setup()
    render(
      <TimesheetCard
        timesheet={timesheet({ status: 'rejected', decidedAt: 1704700000 })}
        entries={ENTRIES}
        isOwner
        canApprove={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Resubmit' }))

    expect(mocks.submitTimesheet).toHaveBeenCalledWith('tsh_1')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('never offers a decision on the viewer’s own sheet', () => {
    render(
      <TimesheetCard
        timesheet={timesheet()}
        entries={ENTRIES}
        isOwner
        canApprove
      />
    )

    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Recall' })).toBeInTheDocument()
  })

  it('shows the service refusal without dropping the sheet', async () => {
    const user = userEvent.setup()
    mocks.approveTimesheet.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/timesheet-self-approval',
        message: 'A timesheet cannot be approved by its owner.',
      },
    })
    render(
      <TimesheetCard
        timesheet={timesheet()}
        entries={ENTRIES}
        isOwner={false}
        canApprove
      />
    )

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(
      screen.getByText('A timesheet cannot be approved by its owner.')
    ).toBeInTheDocument()
    expect(screen.getByText('Jan 1, 2024 – Jan 7, 2024')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
