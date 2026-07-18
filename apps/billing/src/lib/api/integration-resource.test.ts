import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('./billing-route', () => ({
  Resource: (object: string, value: object) => ({ ...value, object }),
}))
vi.mock('./payment-resource', () => ({ PaymentResource: vi.fn() }))

import {
  BillingBankAccountResource,
  BillingPaymentModeResource,
} from './integration-resource'

describe('integration payment support projections', () => {
  it('never exposes tenant IDs or bank-account balances', () => {
    const account = {
      id: 'ba_1',
      tenantId: 'ten_private',
      name: 'Undeposited funds',
      accountType: 'UNDEPOSITED_FUNDS' as const,
      currency: 'JMD',
      description: null,
      isActive: true,
      balance: 12500n,
      createdAt: 1,
      updatedAt: 2,
    }

    expect(BillingBankAccountResource(account)).toEqual({
      object: 'bank_account',
      id: 'ba_1',
      name: 'Undeposited funds',
      accountType: 'UNDEPOSITED_FUNDS',
      currency: 'JMD',
      description: null,
      isActive: true,
      createdAt: 1,
      updatedAt: 2,
    })
  })

  it('never exposes the payment mode tenant ID', () => {
    const mode = {
      id: 'pm_1',
      tenantId: 'ten_private',
      name: 'Cash',
      isDefault: true,
      isActive: true,
      isSystem: true,
      createdAt: 1,
      updatedAt: 2,
    }

    expect(BillingPaymentModeResource(mode)).toEqual({
      object: 'payment_mode',
      id: 'pm_1',
      name: 'Cash',
      isDefault: true,
      isActive: true,
      isSystem: true,
      createdAt: 1,
      updatedAt: 2,
    })
  })
})
