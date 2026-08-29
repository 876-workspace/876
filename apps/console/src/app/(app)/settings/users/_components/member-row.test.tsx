import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TeamTableRow, type TeamRow } from './member-row'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: { team: { revoke: mocks.revoke } },
}))

function row(overrides: Partial<TeamRow> = {}): TeamRow {
  return {
    id: 'user_695d45c54a374ff0a570003e15668891',
    firstName: 'Alejandra',
    lastName: 'Reyes',
    email: 'alejandra@example.com',
    username: 'alejandra',
    avatar: null,
    position: 'Platform Engineer',
    affiliation: 'staff',
    role: 'admin',
    expiresAt: null,
    resolved: true,
    ...overrides,
  }
}

function renderRow(value: TeamRow) {
  return render(
    <table>
      <tbody>
        <TeamTableRow user={value} />
      </tbody>
    </table>
  )
}

describe('TeamTableRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.revoke.mockResolvedValue({ data: { count: 1 }, error: null })
  })

  it('renders the resolved identity and position', () => {
    renderRow(row())

    expect(screen.getByText('Alejandra Reyes')).toBeInTheDocument()
    expect(screen.getByText('@alejandra')).toBeInTheDocument()
    expect(screen.getByText('alejandra@example.com')).toBeInTheDocument()
    expect(screen.getByText('Platform Engineer')).toBeInTheDocument()
  })

  it('renders affiliation and role as badges', () => {
    renderRow(row({ affiliation: 'external', role: 'super_admin' }))

    expect(screen.getByText('External').closest('[data-slot="badge"]')).not.toBeNull()
    expect(screen.getByText('Super Admin').closest('[data-slot="badge"]')).not.toBeNull()
  })

  it('renders an em dash expiry for staff', () => {
    renderRow(row({ affiliation: 'staff', expiresAt: 1893628800 }))

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the exact expiry date for an external grant', () => {
    renderRow(row({ affiliation: 'external', expiresAt: 1893628800 }))

    expect(screen.getByText('Jan 3, 2030')).toBeInTheDocument()
  })

  it('keeps an unresolved grant visible and identifiable', () => {
    renderRow(
      row({
        firstName: '',
        lastName: '',
        email: '',
        username: null,
        position: null,
        resolved: false,
      })
    )

    expect(screen.getByText('Unresolved account')).toBeInTheDocument()
    expect(
      screen.getByText('user_695d45c54a374ff0a570003e15668891')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument()
  })

  it('does not show the revoke affordance for a resolved account', () => {
    renderRow(row())

    expect(screen.queryByRole('button', { name: 'Revoke' })).toBeNull()
    expect(mocks.revoke).not.toHaveBeenCalled()
  })

  it('revokes an unresolved grant and refreshes the list', async () => {
    renderRow(row({ resolved: false, firstName: '', lastName: '', email: '' }))

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => {
      expect(mocks.revoke).toHaveBeenCalledTimes(1)
      expect(mocks.revoke).toHaveBeenCalledWith(
        'user_695d45c54a374ff0a570003e15668891'
      )
      expect(mocks.refresh).toHaveBeenCalledTimes(1)
    })
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('does not refresh after a failed revoke', async () => {
    mocks.revoke.mockResolvedValue({
      data: null,
      error: { code: 'auth/forbidden', message: 'Forbidden', httpStatus: 403 },
    })
    renderRow(row({ resolved: false, firstName: '', lastName: '', email: '' }))

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => expect(mocks.revoke).toHaveBeenCalledTimes(1))
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
