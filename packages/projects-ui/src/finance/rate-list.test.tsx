// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Rate } from '@876/projects'

import { RateList } from './rate-list'

function makeRate(overrides?: Partial<Rate>): Rate {
  return {
    object: 'projects.rate',
    id: 'rate_1',
    tenantId: 'tenant_1',
    projectId: 'prj_1',
    userId: null,
    scope: 'project',
    billRateMinor: 15000,
    costRateMinor: 9000,
    currency: 'USD',
    effectiveFrom: null,
    effectiveTo: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

const props = {
  newHref: '/projects/prj_1/finance/rates/new',
  editBaseHref: '/projects/prj_1/finance/rates',
  canEdit: true,
}

describe('RateList', () => {
  afterEach(cleanup)

  it('renders an empty state when there are no rates', () => {
    render(<RateList rates={[]} {...props} />)

    expect(screen.getAllByText('No rates yet').length).toBeGreaterThan(0)
  })

  it('renders bill and cost rates per hour', () => {
    render(<RateList rates={[makeRate()]} {...props} />)

    expect(screen.getAllByText('US$150.00/h').length).toBeGreaterThan(0)
    expect(screen.getAllByText('US$90.00/h').length).toBeGreaterThan(0)
  })

  it('labels user-scoped rates with the member', () => {
    render(
      <RateList
        rates={[makeRate({ id: 'rate_2', scope: 'user', userId: 'usr_9' })]}
        {...props}
      />
    )

    expect(screen.getAllByText(/usr_9/).length).toBeGreaterThan(0)
  })

  it('links each rate to its edit route and hides links without permission', () => {
    const { unmount } = render(<RateList rates={[makeRate()]} {...props} />)
    expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveAttribute(
      'href',
      '/projects/prj_1/finance/rates/rate_1/edit'
    )
    unmount()
    cleanup()

    render(<RateList rates={[makeRate()]} {...props} canEdit={false} />)
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
  })
})
