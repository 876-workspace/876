/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
}))

vi.mock('@/lib/auth/billing-context', async (original) => {
  const actual = (await original()) as Record<string, unknown>
  return {
    ...actual,
    requirePagePermission: mocks.permission,
  }
})

vi.mock('./_components/senders-data', () => ({
  SendersData: () => <div data-testid="senders-data" />,
}))
vi.mock('./_components/domains-data', () => ({
  DomainsData: () => <div data-testid="domains-data" />,
}))
vi.mock('./_components/domain-records-data', () => ({
  DomainRecordsData: () => <div data-testid="domain-records-data" />,
}))
vi.mock('./_components/templates-data', () => ({
  TemplatesData: () => <div data-testid="templates-data" />,
}))
vi.mock('./_components/email-domain-add-form', () => ({
  EmailDomainAddForm: () => <div data-testid="email-domain-add-form" />,
}))

import EmailSettingsPage from './page'

function managerContext() {
  return {
    orgId: 'org_1',
    role: 'admin',
    permissions: ['settings:read'],
  }
}

describe('Email settings page chrome', () => {
  beforeEach(() => vi.resetAllMocks())

  it('renders toolbar, breadcrumb and every panel region without data', async () => {
    mocks.permission.mockResolvedValue(managerContext())

    render(await EmailSettingsPage())

    expect(
      screen.getByRole('link', { name: 'Settings' })
    ).toHaveAttribute('href', '/settings')
    expect(screen.getByText('Email settings')).toBeInTheDocument()
    expect(screen.getByTestId('email-domain-add-form')).toBeInTheDocument()
    expect(screen.getByTestId('senders-data')).toBeInTheDocument()
    expect(screen.getByTestId('domains-data')).toBeInTheDocument()
    expect(screen.getByTestId('domain-records-data')).toBeInTheDocument()
    expect(screen.getByTestId('templates-data')).toBeInTheDocument()
  })

  it('hides the add form from viewers who cannot manage', async () => {
    mocks.permission.mockResolvedValue({
      orgId: 'org_1',
      role: 'staff',
      permissions: ['settings:read'],
    })

    render(await EmailSettingsPage())

    expect(screen.getByText('Email settings')).toBeInTheDocument()
    expect(screen.queryByTestId('email-domain-add-form')).toBeNull()
    expect(screen.getByTestId('senders-data')).toBeInTheDocument()
  })
})
