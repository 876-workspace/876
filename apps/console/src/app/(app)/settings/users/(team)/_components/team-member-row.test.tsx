/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

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

  it('renders role badge and shows external badge only for external affiliation', () => {
    renderRow(row({ affiliation: 'external', role: 'super_admin' }))

    expect(
      screen.getByText('External').closest('[data-slot="badge"]')
    ).not.toBeNull()
    expect(
      screen.getByText('Super Admin').closest('[data-slot="badge"]')
    ).not.toBeNull()
  })

  it('does not render external badge for staff', () => {
    renderRow(row({ affiliation: 'staff', role: 'admin' }))

    expect(screen.queryByText('External')).toBeNull()
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
  })

  it('triggers onSelect when supplied', () => {
    const onSelect = vi.fn()
    render(
      <table>
        <tbody>
          <TeamTableRow user={row()} onSelect={onSelect} />
        </tbody>
      </table>
    )

    fireEvent.click(screen.getByText('Alejandra Reyes'))
    expect(onSelect).toHaveBeenCalledWith(
      'user_695d45c54a374ff0a570003e15668891'
    )
  })

  it('navigates via router.push when onSelect is omitted', () => {
    renderRow(row())

    fireEvent.click(screen.getByText('Alejandra Reyes'))
    expect(mocks.push).toHaveBeenCalledWith(
      '/settings/users/user_695d45c54a374ff0a570003e15668891'
    )
  })
})
