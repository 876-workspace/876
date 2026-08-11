/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveCustomer: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('../../_lib/customer-data', () => ({
  resolveCustomer: mocks.resolveCustomer,
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
}))

import { CustomerOverviewData } from './_components/customer-overview-data'
import CustomerOverviewPage from './page'

const params = Promise.resolve({ orgSlug: 'island-logistics', id: 'cprof_123' })

function customer(overrides: Record<string, unknown> = {}) {
  return {
    profile: {
      billingCustomerId: 'cus_123',
      trn: '123-456-789',
      isCommercial: true,
    },
    identity: {
      name: 'Marlon Brown',
      companyName: 'Brown Trading',
      email: 'marlon@example.com',
      phone: '+18765550142',
    },
    mailbox: { number: 'KNG-1042' },
    branch: { name: 'Kingston' },
    ...overrides,
  }
}

describe('CustomerOverviewData', () => {
  beforeEach(() => {
    mocks.resolveCustomer.mockResolvedValue(customer())
    vi.clearAllMocks()
    mocks.resolveCustomer.mockResolvedValue(customer())
  })

  it('keeps the identity and courier fields in the customer overview', async () => {
    render(await CustomerOverviewData({ params }))

    expect(screen.getByText('Identity')).toBeVisible()
    expect(screen.getByText('Courier details')).toBeVisible()
    expect(screen.getByText('Brown Trading')).toBeVisible()
    expect(screen.getByText('123-456-789')).toBeVisible()
    expect(screen.getByText('Yes')).toBeVisible()
  })

  it('shows a placeholder for identity fields that have no value', async () => {
    mocks.resolveCustomer.mockResolvedValue(
      customer({ identity: { ...customer().identity, companyName: null } })
    )

    render(await CustomerOverviewData({ params }))

    expect(screen.getAllByText('—')).not.toHaveLength(0)
  })

  it('falls back to billingCustomerId when identity name is missing', async () => {
    mocks.resolveCustomer.mockResolvedValue(
      customer({ identity: { ...customer().identity, name: null } })
    )
    render(await CustomerOverviewData({ params }))
    expect(screen.getByText('cus_123')).toBeVisible()
  })

  it('renders billingCustomerId fallback when identity is null', async () => {
    mocks.resolveCustomer.mockResolvedValue(customer({ identity: null }))
    render(await CustomerOverviewData({ params }))
    expect(screen.getByText('cus_123')).toBeVisible()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
  })

  it('renders No for non-commercial customers', async () => {
    mocks.resolveCustomer.mockResolvedValue(
      customer({ profile: { ...customer().profile, isCommercial: false } })
    )
    render(await CustomerOverviewData({ params }))
    expect(screen.getByText('No')).toBeVisible()
    expect(screen.queryByText('Yes')).not.toBeInTheDocument()
  })

  it('shows placeholders when mailbox and branch are missing', async () => {
    mocks.resolveCustomer.mockResolvedValue(
      customer({ mailbox: null, branch: null })
    )
    render(await CustomerOverviewData({ params }))
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('123-456-789')).toBeVisible()
  })

  it('calls notFound when customer does not exist', async () => {
    mocks.resolveCustomer.mockResolvedValue(null)
    await expect(CustomerOverviewData({ params })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    )
    expect(mocks.notFound).toHaveBeenCalledTimes(1)
  })

  it('renders all 8 expected fields with labels', async () => {
    render(await CustomerOverviewData({ params }))
    for (const label of [
      'Name',
      'Company',
      'Email',
      'Phone',
      'Mailbox',
      'Home branch',
      'TRN',
      'Commercial',
    ]) {
      expect(screen.getByText(label)).toBeVisible()
    }
  })

  it('uses a two-column grid layout', async () => {
    const { container } = render(await CustomerOverviewData({ params }))
    expect(container.firstChild).toHaveClass('grid')
    expect(container.firstChild).toHaveClass('md:grid-cols-2')
  })

  it('resolves customer with orgSlug and id from params', async () => {
    const customParams = Promise.resolve({
      orgSlug: 'nkr-express',
      id: 'cprof_999',
    })
    render(await CustomerOverviewData({ params: customParams }))
    expect(mocks.resolveCustomer).toHaveBeenCalledWith(
      'nkr-express',
      'cprof_999'
    )
  })
})

describe('CustomerOverviewPage — streaming wrapper', () => {
  beforeEach(() => {
    mocks.resolveCustomer.mockResolvedValue(customer())
    vi.clearAllMocks()
    mocks.resolveCustomer.mockResolvedValue(customer())
  })

  it('is synchronous and renders a Suspense boundary with skeleton fallback', () => {
    const result = CustomerOverviewPage({ params })
    const { container } = render(result)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(10)
    expect(container.querySelectorAll('section')).toHaveLength(2)
  })

  it('uses CustomerOverviewSkeleton as fallback (same markup as loading.tsx)', async () => {
    const pageResult = CustomerOverviewPage({ params })
    const { container: pageContainer } = render(pageResult)
    const { CustomerOverviewSkeleton } =
      await import('./_components/customer-overview-skeleton')
    const { container: skeletonContainer } = render(
      <CustomerOverviewSkeleton />
    )
    expect(pageContainer.innerHTML).toBe(skeletonContainer.innerHTML)
  })
})
