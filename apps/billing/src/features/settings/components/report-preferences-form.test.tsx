/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: { reportPreferences: { update: mocks.update } },
}))

import { ReportPreferencesForm } from './report-preferences-form'

const TIME_ZONES = ['America/Jamaica', 'America/New_York', 'UTC']

function renderForm(canManage = true) {
  return render(
    <ReportPreferencesForm
      initial={{ timezone: 'America/Jamaica', fiscalYearStartMonth: 1 }}
      timeZones={TIME_ZONES}
      canManage={canManage}
    />
  )
}

describe('ReportPreferencesForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ data: null, error: null })
  })

  it('updates preferences once with the exact payload', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.selectOptions(
      screen.getByLabelText('Fiscal year start'),
      '4'
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledTimes(1)
    )
    expect(mocks.update).toHaveBeenCalledWith({
      timezone: 'America/Jamaica',
      fiscalYearStartMonth: 4,
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('blocks submission for an unknown timezone without calling update', async () => {
    const user = userEvent.setup()
    renderForm()
    const timezoneInput = screen.getByLabelText('Reporting timezone')
    await user.clear(timezoneInput)
    await user.type(timezoneInput, 'Mars/Olympus')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('Select a reporting timezone from the list.')
    ).toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('disables every control without manage permission', () => {
    renderForm(false)
    expect(screen.getByLabelText('Reporting timezone')).toBeDisabled()
    expect(screen.getByLabelText('Fiscal year start')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })
})
