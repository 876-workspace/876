import { describe, expect, it } from 'vitest'

import { toDocumentCustomerOption } from './document-recipient'

describe('toDocumentCustomerOption', () => {
  it('falls back to the customer identity when no contact or address exists', () => {
    const result = toDocumentCustomerOption({
      id: 'cus_1',
      name: 'Alicia Brown',
      customerKind: 'INDIVIDUAL',
      companyName: null,
      salutation: null,
      firstName: 'Alicia',
      lastName: 'Brown',
      email: 'alicia@example.com',
      phone: '876-555-0100',
      workPhone: null,
      priceListId: null,
      contacts: [],
      addresses: [],
    })

    expect(result).toEqual({
      value: 'cus_1',
      label: 'Alicia Brown',
      priceListId: null,
      organizationName: null,
      contactName: 'Alicia Brown',
      email: 'alicia@example.com',
      phone: '876-555-0100',
      address: null,
    })
  })

  it('handles undefined contacts and addresses safely', () => {
    const result = toDocumentCustomerOption({
      id: 'cus_2',
      name: 'Acme Corp',
      customerKind: 'BUSINESS',
      companyName: 'Acme Corp Inc',
      salutation: null,
      firstName: null,
      lastName: null,
      email: 'info@acme.com',
      phone: null,
      workPhone: '876-555-0200',
      priceListId: 'pl_123',
    })

    expect(result).toEqual({
      value: 'cus_2',
      label: 'Acme Corp Inc',
      priceListId: 'pl_123',
      organizationName: 'Acme Corp Inc',
      contactName: null,
      email: 'info@acme.com',
      phone: '876-555-0200',
      address: null,
    })
  })

  it('uses primaryContact when provided', () => {
    const result = toDocumentCustomerOption({
      id: 'cus_3',
      name: 'Global Tech',
      customerKind: 'BUSINESS',
      companyName: 'Global Tech Ltd',
      salutation: null,
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      workPhone: null,
      priceListId: null,
      primaryContact: {
        salutation: 'Ms.',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@globaltech.com',
        workPhone: '876-555-0300',
        mobilePhone: '876-555-0301',
      },
    })

    expect(result.contactName).toBe('Ms. Jane Doe')
    expect(result.email).toBe('jane@globaltech.com')
    expect(result.phone).toBe('876-555-0301')
  })
})
