import { describe, expect, it } from 'vitest'

import {
  autoMapHeaders,
  buildFailedRowsCsv,
  buildImportRows,
  chunkRows,
  ignoredHeaders,
  parseCustomerCsv,
} from './import-mapping'

describe('parseCustomerCsv', () => {
  it('parses a required header row and preserves quoted values', () => {
    // ARRANGE
    const csv = 'Customer Name,Notes\n"Blue, Trading","Priority"'

    // ACT
    const result = parseCustomerCsv(csv)

    // ASSERT
    expect(result).toEqual({
      headers: ['Customer Name', 'Notes'],
      rows: [{ 'Customer Name': 'Blue, Trading', Notes: 'Priority' }],
      error: null,
    })

    // AFTER — no teardown needed
  })

  it('rejects a header-only CSV', () => {
    // ARRANGE
    const csv = 'Customer Name,Email'

    // ACT
    const result = parseCustomerCsv(csv)

    // ASSERT
    expect(result).toEqual({
      headers: [],
      rows: [],
      error: 'The CSV has no data rows.',
    })

    // AFTER — no teardown needed
  })
})

describe('autoMapHeaders', () => {
  it('maps normalized aliases and leaves unknown columns ignored', () => {
    // ARRANGE
    const headers = [
      'Display Name',
      'Company',
      'Phone Number',
      'TRN',
      'Billing_Address Line 1',
      'Shipping City',
      'Legacy Balance',
    ]

    // ACT
    const mapping = autoMapHeaders(headers)

    // ASSERT
    expect(mapping).toEqual({
      'Display Name': 'name',
      Company: 'companyName',
      'Phone Number': 'phone',
      TRN: 'taxRegistrationNumber',
      'Billing_Address Line 1': 'billingAddress.line1',
      'Shipping City': 'shippingAddress.city',
      'Legacy Balance': null,
    })
    expect(ignoredHeaders(headers, mapping)).toEqual(['Legacy Balance'])

    // AFTER — no teardown needed
  })

  it('keeps the first alias when two headers collide on one target', () => {
    // ARRANGE
    const headers = ['Customer Name', 'Display Name', 'Mobile', 'Phone']

    // ACT
    const mapping = autoMapHeaders(headers)

    // ASSERT
    expect(mapping).toEqual({
      'Customer Name': 'name',
      'Display Name': null,
      Mobile: 'phone',
      Phone: null,
    })

    // AFTER — no teardown needed
  })
})

describe('buildImportRows', () => {
  it('trims values, omits empties, groups addresses, and assigns CSV line numbers', () => {
    // ARRANGE
    const rows = [
      {
        Name: '  Blue Mountain Trading  ',
        Kind: ' business ',
        Email: '  accounts@blue.test ',
        Notes: '   ',
        Currency: ' jmd ',
        'Billing line 1': ' 12 Harbour Street ',
        'Billing city': ' Kingston ',
        'Billing country': ' jm ',
        'Shipping line 1': '',
        'Contact email': ' dispatch@blue.test ',
      },
      {
        Name: ' Nia Campbell ',
        Kind: 'person',
        Email: '',
        Notes: ' Priority ',
        Currency: '',
        'Billing line 1': '',
        'Billing city': '',
        'Billing country': '',
        'Shipping line 1': ' 4 Hope Road ',
        'Contact email': '',
      },
    ]
    const mapping = {
      Name: 'name',
      Kind: 'customerKind',
      Email: 'email',
      Notes: 'notes',
      Currency: 'currency',
      'Billing line 1': 'billingAddress.line1',
      'Billing city': 'billingAddress.city',
      'Billing country': 'billingAddress.countryCode',
      'Shipping line 1': 'shippingAddress.line1',
      'Contact email': 'contact.email',
    } as const

    // ACT
    const result = buildImportRows(rows, mapping)

    // ASSERT
    expect(result).toEqual([
      {
        rowNumber: 2,
        name: 'Blue Mountain Trading',
        customerKind: 'BUSINESS',
        email: 'accounts@blue.test',
        currency: 'JMD',
        billingAddress: {
          line1: '12 Harbour Street',
          city: 'Kingston',
          countryCode: 'JM',
        },
        contact: { email: 'dispatch@blue.test' },
      },
      {
        rowNumber: 3,
        name: 'Nia Campbell',
        customerKind: 'INDIVIDUAL',
        notes: 'Priority',
        shippingAddress: { line1: '4 Hope Road' },
      },
    ])

    // AFTER — no teardown needed
  })
})

describe('chunkRows', () => {
  it('preserves order while splitting rows at the requested limit', () => {
    // ARRANGE
    const rows = [1, 2, 3, 4, 5]

    // ACT
    const result = chunkRows(rows, 2)

    // ASSERT
    expect(result).toEqual([[1, 2], [3, 4], [5]])

    // AFTER — no teardown needed
  })

  it('rejects a non-positive chunk size', () => {
    // ARRANGE
    const rows = [1]

    // ACT
    const act = () => chunkRows(rows, 0)

    // ASSERT
    expect(act).toThrow('Chunk size must be a positive integer.')

    // AFTER — no teardown needed
  })
})

describe('buildFailedRowsCsv', () => {
  it('exports only failed original rows with escaped error messages', () => {
    // ARRANGE
    const headers = ['Customer Name', 'Notes']
    const rows = [
      { 'Customer Name': 'Valid Customer', Notes: '' },
      { 'Customer Name': 'Broken, Customer', Notes: 'Said "hello"' },
    ]
    const results = [
      {
        rowNumber: 2,
        action: 'created' as const,
        customerId: 'cus_123',
        error: null,
      },
      {
        rowNumber: 3,
        action: 'failed' as const,
        customerId: null,
        error: { code: 'billing/invalid', message: 'Name, already exists.' },
      },
    ]

    // ACT
    const csv = buildFailedRowsCsv(headers, rows, results)

    // ASSERT
    expect(csv).toBe(
      'Customer Name,Notes,Error\n"Broken, Customer","Said ""hello""","Name, already exists."'
    )

    // AFTER — no teardown needed
  })
})
