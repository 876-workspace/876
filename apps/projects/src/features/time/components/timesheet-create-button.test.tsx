import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createTimesheet: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('@/lib/client/time', () => ({
  timeClient: { createTimesheet: mocks.createTimesheet },
}))

const { TimesheetCreateButton } = await import('./timesheet-create-button')

const PERIOD = { from: 1704067200, to: 1704671999 }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createTimesheet.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1' },
    error: null,
  })
})

describe('TimesheetCreateButton', () => {
  it('gathers the shown period into a sheet', async () => {
    const user = userEvent.setup()
    render(<TimesheetCreateButton period={PERIOD} />)

    await user.click(screen.getByRole('button', { name: 'Create for period' }))

    expect(mocks.createTimesheet).toHaveBeenCalledWith({
      periodStart: PERIOD.from,
      periodEnd: PERIOD.to,
    })
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('keeps the button in place with the reason when the sheet is refused', async () => {
    const user = userEvent.setup()
    mocks.createTimesheet.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/invalid-request',
        message: 'periodEnd must be at or after periodStart.',
      },
    })
    render(<TimesheetCreateButton period={PERIOD} />)

    await user.click(screen.getByRole('button', { name: 'Create for period' }))

    expect(
      screen.getByText('periodEnd must be at or after periodStart.')
    ).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
