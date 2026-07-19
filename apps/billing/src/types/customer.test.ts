import { describe, expect, it } from 'vitest'

import {
  CustomerCreateSchema,
  CustomerImportSchema,
  CustomerUpdateSchema,
} from './customer'

describe('customer commercial schemas', () => {
  it('trims and accepts nullable commercial fields including a bare-domain website', () => {
    const result = CustomerCreateSchema.parse({
      name: 'Island Supplies',
      customerNumber: '  C-876  ',
      website: '  island.test  ',
      notes: '  Preferred customer.  ',
      taxRegistrationNumber: '  TRN-876  ',
    })

    expect(result).toEqual({
      name: 'Island Supplies',
      customerKind: 'INDIVIDUAL',
      customerNumber: 'C-876',
      website: 'island.test',
      notes: 'Preferred customer.',
      taxRegistrationNumber: 'TRN-876',
      customerType: 'EXTERNAL',
      lateFeeExempt: false,
    })
  })

  it('preserves explicit nulls in commercial customer updates', () => {
    const result = CustomerUpdateSchema.parse({
      customerNumber: null,
      website: null,
      notes: null,
      taxRegistrationNumber: null,
    })

    expect(result).toEqual({
      customerNumber: null,
      website: null,
      notes: null,
      taxRegistrationNumber: null,
    })
  })

  it.each([
    ['customerNumber', ''],
    ['customerNumber', 'a'.repeat(61)],
    ['website', '   '],
    ['website', 'a'.repeat(201)],
    ['notes', ''],
    ['notes', 'a'.repeat(5001)],
    ['taxRegistrationNumber', '\t'],
    ['taxRegistrationNumber', 'a'.repeat(61)],
  ] as const)('rejects an invalid %s value', (field, value) => {
    const result = CustomerCreateSchema.safeParse({
      name: 'Island Supplies',
      [field]: value,
    })

    expect(result.success).toBe(false)
  })

  it('rejects core identity fields in external-customer imports', () => {
    const result = CustomerImportSchema.safeParse({
      duplicateStrategy: 'skip',
      rows: [
        {
          rowNumber: 2,
          name: 'Core Customer',
          customerType: 'CORE_USER',
          userId: 'usr_123',
        },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('rejects duplicate caller row references', () => {
    const result = CustomerImportSchema.safeParse({
      duplicateStrategy: 'skip',
      rows: [
        { rowNumber: 2, name: 'First Customer' },
        { rowNumber: 2, name: 'Second Customer' },
      ],
    })

    expect(result.success).toBe(false)
  })
})
