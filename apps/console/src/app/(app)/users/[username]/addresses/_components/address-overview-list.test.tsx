/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import type { AdminAddress } from '@876/admin'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AddressOverviewList } from './address-overview-list'

const baseAddress: AdminAddress = {
  object: 'address',
  id: 'addr_1',
  user_id: 'user_1',
  organization_id: null,
  type: 'billing',
  label: null,
  line1: '12 Ocean Ave',
  line2: null,
  city: 'Kingston',
  region_id: null,
  country_code: 'jm',
  postal_code: null,
  is_default: false,
  created_at: 1700000000,
  updated_at: 1700000000,
}

describe('AddressOverviewList', () => {
  it('renders compact address previews with normalized labels', () => {
    render(
      <AddressOverviewList
        addresses={[
          baseAddress,
          {
            ...baseAddress,
            id: 'addr_2',
            type: 'shipping',
            label: 'Warehouse',
            line1: null,
            city: null,
            country_code: null,
          },
        ]}
      />
    )

    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByText('12 Ocean Ave, Kingston, JM')).toBeInTheDocument()
    expect(screen.getByText('Warehouse')).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
  })
})
