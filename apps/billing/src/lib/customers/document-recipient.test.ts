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
})
