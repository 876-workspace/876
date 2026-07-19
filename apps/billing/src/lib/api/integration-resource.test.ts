import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('./billing-route', () => ({
  Resource: (object: string, value: object) => ({ ...value, object }),
}))
vi.mock('./payment-resource', () => ({ PaymentResource: vi.fn() }))

import {
  BillingBankAccountResource,
  BillingCustomerResource,
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

function customerRow() {
  return {
    id: 'cus_1',
    sourceAppId: null,
    sourceExternalReference: null,
    customerType: 'EXTERNAL',
    customerKind: 'BUSINESS',
    organizationId: null,
    userId: null,
    externalReference: null,
    customerNumber: 'C-1',
    name: 'Island Supplies',
    salutation: null,
    firstName: null,
    lastName: null,
    companyName: 'Island Supplies Limited',
    email: 'billing@island.test',
    phone: null,
    workPhone: null,
    website: 'island.test',
    notes: 'Wholesale customer.',
    taxRegistrationNumber: 'TRN-1',
    billingAddress: null,
    metadata: null,
    defaultCurrency: 'JMD',
    language: 'en',
    outstandingReceivable: 0n,
    unusedCredits: 0n,
    coreSyncedAt: null,
    status: 'ACTIVE',
    createdAt: 1,
    updatedAt: 2,
  }
}

describe('BillingCustomerResource', () => {
  it('keeps list rows lean when relations were not retrieved', () => {
    const row = customerRow()
    const {
      sourceAppId: _sourceAppId,
      sourceExternalReference: _sourceExternalReference,
      ...publicRow
    } = row

    const result = BillingCustomerResource(row)

    expect(result).toEqual({
      ...publicRow,
      object: 'customer',
      source: null,
    })
    expect(result).not.toHaveProperty('contacts')
    expect(result).not.toHaveProperty('addresses')
  })

  it('projects ordered detail relations without internal or coordinate fields', () => {
    const contact = {
      id: 'con_1',
      tenantId: 'ten_private',
      customerId: 'cus_1',
      userId: 'usr_private',
      salutation: 'Ms',
      firstName: 'Nia',
      lastName: 'Brown',
      email: 'nia@island.test',
      workPhone: null,
      mobilePhone: '+18765550123',
      isPrimary: true,
      coreSyncedAt: 1,
      createdAt: 2,
      updatedAt: 3,
    }
    const address = {
      id: 'addr_1',
      tenantId: 'ten_private',
      customerId: 'cus_1',
      type: 'billing',
      label: 'Head office',
      attention: null,
      line1: '10 Ocean Road',
      line2: null,
      city: 'Kingston',
      state: 'Kingston',
      postalCode: null,
      countryCode: 'JM',
      latitude: 18.0179,
      longitude: -76.8099,
      isDefault: true,
      createdAt: 2,
      updatedAt: 3,
    }

    const result = BillingCustomerResource({
      ...customerRow(),
      contacts: [contact],
      addresses: [address],
    })

    expect(result.contacts).toEqual([
      {
        object: 'customer_contact',
        id: 'con_1',
        salutation: 'Ms',
        firstName: 'Nia',
        lastName: 'Brown',
        email: 'nia@island.test',
        workPhone: null,
        mobilePhone: '+18765550123',
        isPrimary: true,
        createdAt: 2,
        updatedAt: 3,
      },
    ])
    expect(result.addresses).toEqual([
      {
        object: 'customer_address',
        id: 'addr_1',
        type: 'billing',
        label: 'Head office',
        attention: null,
        line1: '10 Ocean Road',
        line2: null,
        city: 'Kingston',
        state: 'Kingston',
        postalCode: null,
        countryCode: 'JM',
        isDefault: true,
        createdAt: 2,
        updatedAt: 3,
      },
    ])
  })
})
