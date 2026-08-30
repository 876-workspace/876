/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TeamMemberTableRow, type TeamMemberRow } from './team-member-row'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('status=active'),
}))

function row(overrides: Partial<TeamMemberRow> = {}): TeamMemberRow {
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

function renderRow(value: TeamMemberRow) {
  return render(
    <table>
      <tbody>
        <TeamMemberTableRow user={value} />
      </tbody>
    </table>
  )
}

describe('TeamMemberTableRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('links to the member route while preserving the list query', () => {
    renderRow(row())

    expect(
      screen.getByRole('link', { name: 'View team member Alejandra Reyes' })
    ).toHaveAttribute(
      'href',
      '/settings/users/user_695d45c54a374ff0a570003e15668891?status=active'
    )
  })
})
