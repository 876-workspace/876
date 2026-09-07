// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { TaxAuthority } from '@876/billing'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    currencies: {
      enable: vi.fn(),
      disable: vi.fn(),
      setDefault: vi.fn(),
    },
    paymentModes: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    taxAuthorities: {
      create: vi.fn(),
      update: vi.fn(),
    },
    taxRates: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import {
  CurrenciesPanel,
  PaymentModesPanel,
  TaxesPanel,
} from './finance-settings'

describe('CurrenciesPanel', () => {
  it('renders currencies list and add action when canManage is true', () => {
    render(
      <CurrenciesPanel
        currencies={[
          {
            object: 'currency',
            currencyCode: 'USD',
            isDefault: true,
            isEnabled: true,
            createdAt: 1000,
            updatedAt: 1000,
            currency: {
              code: 'USD',
              name: 'US Dollar',
              symbol: '$',
              decimalPlaces: 2,
              isActive: true,
            },
          },
        ]}
        canManage={true}
      />
    )
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('US Dollar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('hides add action when canManage is false', () => {
    render(<CurrenciesPanel currencies={[]} canManage={false} />)
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull()
  })
})

describe('PaymentModesPanel', () => {
  it('renders payment modes and add action when canManage is true', () => {
    render(
      <PaymentModesPanel
        paymentModes={[
          {
            object: 'payment_mode',
            id: 'pm_1',
            name: 'Cash',
            isDefault: false,
            isActive: true,
            isSystem: false,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ]}
        canManage={true}
      />
    )
    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('hides add action when canManage is false', () => {
    render(<PaymentModesPanel paymentModes={[]} canManage={false} />)
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull()
  })
})

describe('TaxesPanel', () => {
  it('renders tax authorities and tax rates panels', () => {
    const authority: TaxAuthority = {
      object: 'tax_authority',
      id: 'ta_1',
      name: 'Tax Admin',
      description: null,
      countryCode: 'JM',
      subdivisionCode: null,
      isDefault: true,
      isActive: true,
      createdAt: 1000,
      updatedAt: 1000,
    }

    render(
      <TaxesPanel
        authorities={[authority]}
        rates={[
          {
            object: 'tax_rate',
            id: 'tr_1',
            name: 'GCT Standard',
            description: null,
            taxType: 'VAT',
            rate: '15.00',
            inclusive: false,
            startsAt: 1000,
            isDefault: true,
            isActive: true,
            taxAuthority: authority,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ]}
        canManage={true}
        currentTimestamp={1000}
      />
    )
    expect(screen.getByText('Tax Admin')).toBeInTheDocument()
    expect(screen.getByText('GCT Standard')).toBeInTheDocument()
  })
})
