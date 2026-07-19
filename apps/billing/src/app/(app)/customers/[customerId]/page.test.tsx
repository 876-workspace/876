/** @vitest-environment jsdom */

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  notFound: vi.fn(),
  resolveCustomer: vi.fn(),
  resolveCustomerParty: vi.fn(),
}))

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/app/(app)/detail-data', () => ({
  resolveCustomer: mocks.resolveCustomer,
}))
vi.mock('@/lib/auth/billing-context', () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
}))
vi.mock('./_data', () => ({
  resolveCustomerParty: mocks.resolveCustomerParty,
}))
vi.mock('@/components/detail-accordion', () => ({
  DetailAccordion: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DetailAccordionCard: ({
    children,
    title,
  }: {
    children: ReactNode
    title: string
  }) => <section aria-label={title}>{children}</section>,
  FactGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Fact: ({ label, value }: { label: string; value: ReactNode }) => (
    <div data-testid={`fact-${label}`}>{value}</div>
  ),
}))
vi.mock('@/components/metric-card', () => ({
  MetricCard: ({ label, value }: { label: string; value: ReactNode }) => (
    <div>
      {label}: {value}
    </div>
  ),
}))

import CustomerDetailPage from './page'

function customer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cus_876',
    customerType: 'EXTERNAL',
    organizationId: null,
    userId: null,
    externalReference: 'external-876',
    customerNumber: 'C-876',
    website: 'islandsupply.test',
    taxRegistrationNumber: 'TRN-876',
    notes: 'Wholesale account.',
    defaultCurrency: 'JMD',
    createdAt: 1_788_000_000,
    _count: { subscriptions: 2, invoices: 4, quotes: 1 },
    ...overrides,
  }
}

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getWorkspaceContext.mockResolvedValue({
      tenant: { id: 'ten_876', defaultCurrency: 'JMD' },
    })
    mocks.resolveCustomerParty.mockResolvedValue({
      contact: null,
      memberCount: null,
      org: null,
    })
    mocks.resolveCustomer.mockResolvedValue(customer())
  })

  it('displays all four commercial customer values', async () => {
    render(
      await CustomerDetailPage({
        params: Promise.resolve({ customerId: 'cus_876' }),
      })
    )

    expect(screen.getByTestId('fact-Customer number')).toHaveTextContent(
      'C-876'
    )
    expect(screen.getByTestId('fact-Website')).toHaveTextContent(
      'islandsupply.test'
    )
    expect(
      screen.getByTestId('fact-Tax registration number')
    ).toHaveTextContent('TRN-876')
    expect(screen.getByTestId('fact-Notes')).toHaveTextContent(
      'Wholesale account.'
    )
  })

  it('displays an em dash when each commercial value is null', async () => {
    mocks.resolveCustomer.mockResolvedValue(
      customer({
        customerNumber: null,
        website: null,
        taxRegistrationNumber: null,
        notes: null,
      })
    )

    render(
      await CustomerDetailPage({
        params: Promise.resolve({ customerId: 'cus_876' }),
      })
    )

    expect(screen.getByTestId('fact-Customer number')).toHaveTextContent('—')
    expect(screen.getByTestId('fact-Website')).toHaveTextContent('—')
    expect(
      screen.getByTestId('fact-Tax registration number')
    ).toHaveTextContent('—')
    expect(screen.getByTestId('fact-Notes')).toHaveTextContent('—')
  })
})
