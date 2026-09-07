import { Decimal } from '@prisma/client/runtime/client'
import { describe, expect, it } from 'vitest'

import { serializeTaxAuthority, serializeTaxRate } from './tax.serializers'

const authority = {
  id: 'taxauth_1',
  tenantId: 'ten_1',
  name: 'Tax Administration Jamaica',
  description: 'National authority',
  countryCode: 'JM',
  subdivisionCode: null,
  isDefault: true,
  isActive: true,
  createdAt: 100,
  updatedAt: 200,
}

const rate = {
  id: 'taxrate_1',
  tenantId: 'ten_1',
  taxAuthorityId: 'taxauth_1',
  name: 'Standard GCT',
  description: 'Standard rate',
  taxType: 'gct',
  rate: new Decimal('15'),
  inclusive: false,
  startsAt: null,
  isDefault: true,
  isActive: true,
  createdAt: 100,
  updatedAt: 200,
  taxAuthority: authority,
}

describe('tax serializers', () => {
  it('serializes every tax-rate resource field including isDefault', () => {
    expect(serializeTaxRate(rate)).toEqual({
      object: 'tax_rate',
      id: 'taxrate_1',
      name: 'Standard GCT',
      description: 'Standard rate',
      taxType: 'gct',
      rate: '15',
      inclusive: false,
      startsAt: null,
      isDefault: true,
      isActive: true,
      taxAuthority: {
        object: 'tax_authority',
        id: 'taxauth_1',
        name: 'Tax Administration Jamaica',
        description: 'National authority',
        countryCode: 'JM',
        subdivisionCode: null,
        isDefault: true,
        isActive: true,
        createdAt: 100,
        updatedAt: 200,
      },
      createdAt: 100,
      updatedAt: 200,
    })
  })

  it('preserves an inactive non-default tax rate', () => {
    expect(
      serializeTaxRate({ ...rate, isActive: false, isDefault: false })
    ).toMatchObject({
      object: 'tax_rate',
      isActive: false,
      isDefault: false,
    })
  })

  it('serializes the complete tax-authority shape nested by a rate', () => {
    expect(serializeTaxAuthority(authority)).toEqual(
      serializeTaxRate(rate).taxAuthority
    )
  })
})
