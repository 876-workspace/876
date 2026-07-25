import { describe, expect, it } from 'vitest'

import {
  BillingContactSchema,
  BillingCustomerListSchema,
  BillingCustomerSchema,
  DeletedBillingCustomerSchema,
} from './customer.schema'

const primaryContact = {
  object: 'contact' as const,
  id: 'con_1',
  userId: 'usr_owner',
  salutation: null,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  workPhone: null,
  mobilePhone: '+18765550111',
  isPrimary: true,
  coreSyncedAt: 42,
}

const baseCustomer = {
  object: 'customer' as const,
  id: 'cus_1',
  sourceAppId: null,
  sourceExternalReference: null,
  customerType: 'CORE_ORGANIZATION' as const,
  customerKind: 'BUSINESS' as const,
  organizationId: 'org_1',
  userId: null,
  externalReference: null,
  name: 'Efesto',
  salutation: null,
  firstName: 'Ada',
  lastName: 'Lovelace',
  companyName: 'Efesto Technologies',
  email: 'ap@efesto.test',
  phone: null,
  workPhone: null,
  billingAddress: null,
  metadata: null,
  defaultCurrency: 'JMD',
  language: 'en',
  outstandingReceivable: '0',
  unusedCredits: '0',
  coreSyncedAt: 100,
  status: 'ACTIVE' as const,
  createdAt: 1,
  updatedAt: 1,
  primaryContact,
}

describe('BillingContactSchema', () => {
  it('accepts a fully-populated primary contact', () => {
    const result = BillingContactSchema.safeParse(primaryContact)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.object).toBe('contact')
    expect(result.data.isPrimary).toBe(true)
    expect(result.data.userId).toBe('usr_owner')
  })

  it('accepts null optional fields and a null coreSyncedAt', () => {
    const result = BillingContactSchema.safeParse({
      object: 'contact',
      id: 'con_2',
      userId: null,
      salutation: null,
      firstName: null,
      lastName: null,
      email: null,
      workPhone: null,
      mobilePhone: null,
      isPrimary: false,
      coreSyncedAt: null,
    })

    expect(result.success).toBe(true)
  })

  it.each([
    { object: 'customer', id: 'con_1' },
    { object: 'contact', id: '' },
    {
      object: 'contact',
      id: 'con_1',
      userId: null,
      salutation: null,
      firstName: null,
      lastName: null,
      email: null,
      workPhone: null,
      mobilePhone: null,
      isPrimary: 'yes',
      coreSyncedAt: null,
    },
  ])('rejects malformed contact %j', (payload) => {
    expect(BillingContactSchema.safeParse(payload).success).toBe(false)
  })
})

describe('BillingCustomerSchema', () => {
  it('accepts a core organization customer with primary contact', () => {
    const result = BillingCustomerSchema.safeParse(baseCustomer)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.primaryContact?.userId).toBe('usr_owner')
    expect(result.data.customerKind).toBe('BUSINESS')
    expect(result.data.organizationId).toBe('org_1')
  })

  it('accepts a core user customer with null primary contact', () => {
    const result = BillingCustomerSchema.safeParse({
      ...baseCustomer,
      customerType: 'CORE_USER',
      customerKind: 'INDIVIDUAL',
      organizationId: null,
      userId: 'usr_1',
      companyName: null,
      primaryContact: null,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.primaryContact).toBeNull()
    expect(result.data.userId).toBe('usr_1')
  })

  it('normalizes a missing primaryContact field to null', () => {
    const { primaryContact: _drop, ...without } = baseCustomer
    const result = BillingCustomerSchema.safeParse(without)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.primaryContact).toBeNull()
  })

  it('strips additive Billing columns that are not in the integration contract', () => {
    const result = BillingCustomerSchema.safeParse({
      ...baseCustomer,
      lateFeeExempt: true,
      paymentTermId: 'pt_1',
      salespersonId: null,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).not.toHaveProperty('lateFeeExempt')
    expect(result.data).not.toHaveProperty('paymentTermId')
  })

  it('accepts optional related-resource counts', () => {
    const result = BillingCustomerSchema.safeParse({
      ...baseCustomer,
      counts: { invoices: 2, quotes: 0, subscriptions: 1 },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.counts).toEqual({
      invoices: 2,
      quotes: 0,
      subscriptions: 1,
    })
  })

  it.each([
    { label: 'missing id', patch: { id: '' } },
    { label: 'invalid customerType', patch: { customerType: 'PERSON' } },
    { label: 'invalid customerKind', patch: { customerKind: 'ORG' } },
    { label: 'invalid status', patch: { status: 'DELETED' } },
    {
      label: 'malformed primaryContact',
      patch: { primaryContact: { object: 'contact', id: 'con_1' } },
    },
  ])('rejects $label', ({ patch }) => {
    const result = BillingCustomerSchema.safeParse({
      ...baseCustomer,
      ...patch,
    })

    expect(result.success).toBe(false)
  })
})

describe('BillingCustomerListSchema', () => {
  it('accepts a list of customers including primary contacts', () => {
    const result = BillingCustomerListSchema.safeParse({
      object: 'list',
      data: [
        baseCustomer,
        { ...baseCustomer, id: 'cus_2', primaryContact: null },
      ],
      has_more: false,
      total_count: 2,
      url: '/api/v1/integrations/organizations/org_1/customers',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.data).toHaveLength(2)
    expect(result.data.data[0]?.primaryContact?.id).toBe('con_1')
    expect(result.data.data[1]?.primaryContact).toBeNull()
  })

  it('rejects a non-list object discriminator', () => {
    const result = BillingCustomerListSchema.safeParse({
      object: 'search_result',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/customers',
    })

    expect(result.success).toBe(false)
  })
})

describe('DeletedBillingCustomerSchema', () => {
  it('accepts a deletion tombstone', () => {
    const result = DeletedBillingCustomerSchema.safeParse({
      object: 'customer',
      id: 'cus_1',
      deleted: true,
    })

    expect(result.success).toBe(true)
  })

  it('rejects deleted: false', () => {
    const result = DeletedBillingCustomerSchema.safeParse({
      object: 'customer',
      id: 'cus_1',
      deleted: false,
    })

    expect(result.success).toBe(false)
  })
})

describe('BillingCustomerSchema edge cases', () => {
  it.each(['EXTERNAL', 'CORE_USER', 'CORE_ORGANIZATION'] as const)(
    'accepts customerType %s',
    (customerType) => {
      const result = BillingCustomerSchema.safeParse({
        ...baseCustomer,
        customerType,
        organizationId: customerType === 'CORE_ORGANIZATION' ? 'org_1' : null,
        userId: customerType === 'CORE_USER' ? 'usr_1' : null,
      })

      expect(result.success).toBe(true)
    }
  )

  it.each(['INDIVIDUAL', 'BUSINESS'] as const)(
    'accepts customerKind %s',
    (customerKind) => {
      expect(
        BillingCustomerSchema.safeParse({ ...baseCustomer, customerKind })
          .success
      ).toBe(true)
    }
  )

  it.each(['ACTIVE', 'ARCHIVED'] as const)('accepts status %s', (status) => {
    expect(
      BillingCustomerSchema.safeParse({ ...baseCustomer, status }).success
    ).toBe(true)
  })

  it('normalizes primaryContact: undefined via nullish transform', () => {
    const result = BillingCustomerSchema.safeParse({
      ...baseCustomer,
      primaryContact: undefined,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.primaryContact).toBeNull()
  })

  it('rejects non-integer coreSyncedAt', () => {
    expect(
      BillingCustomerSchema.safeParse({
        ...baseCustomer,
        coreSyncedAt: 1.5,
      }).success
    ).toBe(false)
  })

  it('rejects non-integer createdAt / updatedAt', () => {
    expect(
      BillingCustomerSchema.safeParse({
        ...baseCustomer,
        createdAt: '1',
      }).success
    ).toBe(false)
    expect(
      BillingCustomerSchema.safeParse({
        ...baseCustomer,
        updatedAt: 1.2,
      }).success
    ).toBe(false)
  })

  it('rejects counts with a missing key', () => {
    expect(
      BillingCustomerSchema.safeParse({
        ...baseCustomer,
        counts: { invoices: 1, quotes: 0 },
      }).success
    ).toBe(false)
  })

  it('rejects counts with an extra key under strictObject', () => {
    expect(
      BillingCustomerSchema.safeParse({
        ...baseCustomer,
        counts: {
          invoices: 1,
          quotes: 0,
          subscriptions: 0,
          estimates: 1,
        },
      }).success
    ).toBe(false)
  })

  it('accepts outstandingReceivable and unusedCredits as arbitrary strings', () => {
    const result = BillingCustomerSchema.safeParse({
      ...baseCustomer,
      outstandingReceivable: '12.34',
      unusedCredits: '-1',
    })

    expect(result.success).toBe(true)
  })

  it('accepts null source metadata and null addresses', () => {
    const result = BillingCustomerSchema.safeParse({
      ...baseCustomer,
      sourceAppId: null,
      sourceExternalReference: null,
      billingAddress: null,
      metadata: { note: 'x' },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.metadata).toEqual({ note: 'x' })
  })

  it('rejects a contact with non-boolean isPrimary', () => {
    expect(
      BillingContactSchema.safeParse({
        ...primaryContact,
        isPrimary: 1,
      }).success
    ).toBe(false)
  })

  it('rejects a contact with non-integer coreSyncedAt', () => {
    expect(
      BillingContactSchema.safeParse({
        ...primaryContact,
        coreSyncedAt: 1.25,
      }).success
    ).toBe(false)
  })

  it('list schema rejects a non-array data field', () => {
    expect(
      BillingCustomerListSchema.safeParse({
        object: 'list',
        data: baseCustomer,
        has_more: false,
        total_count: 1,
        url: '/customers',
      }).success
    ).toBe(false)
  })

  it('list schema accepts total_count null', () => {
    const result = BillingCustomerListSchema.safeParse({
      object: 'list',
      data: [],
      has_more: false,
      total_count: null,
      url: '/customers',
    })

    expect(result.success).toBe(true)
  })

  it('list schema rejects missing url', () => {
    expect(
      BillingCustomerListSchema.safeParse({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
      }).success
    ).toBe(false)
  })
})
