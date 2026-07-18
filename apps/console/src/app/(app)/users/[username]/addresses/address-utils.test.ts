import type { AdminAddress } from '@876/admin'
import { describe, expect, it } from 'vitest'

import {
  addressLabel,
  addressPreviewSummary,
  addressSummary,
  createAddressUpdateDraft,
  createEmptyAddressDraft,
  createEmptyAddressUpdateDraft,
  formatAddressType,
  isAddressType,
  toAddressCreateParams,
  toAddressUpdateParams,
} from './address-utils'

const address: AdminAddress = {
  object: 'address',
  id: 'addr_123',
  user_id: 'user_123',
  organization_id: null,
  type: 'shipping',
  label: 'Warehouse',
  line1: '12 Ocean Ave',
  line2: null,
  city: 'Kingston',
  region_id: null,
  country_code: 'jm',
  postal_code: '00000',
  is_default: true,
  created_at: 1700000000,
  updated_at: 1700000100,
}

describe('address utils', () => {
  it('creates fresh empty drafts for create and update flows', () => {
    const createDraft = createEmptyAddressDraft()
    const updateDraft = createEmptyAddressUpdateDraft()

    createDraft.label = 'Changed'
    updateDraft.label = 'Changed'

    expect(createEmptyAddressDraft().label).toBe('')
    expect(createEmptyAddressUpdateDraft().label).toBe('')
  })

  it('maps persisted addresses into editable drafts', () => {
    expect(createAddressUpdateDraft(address)).toEqual({
      type: 'shipping',
      label: 'Warehouse',
      line1: '12 Ocean Ave',
      line2: '',
      city: 'Kingston',
      country_code: 'jm',
      postal_code: '00000',
      is_default: true,
    })

    expect(
      createAddressUpdateDraft({
        ...address,
        label: null,
        line1: null,
        city: null,
        country_code: null,
      })
    ).toMatchObject({
      label: '',
      line1: '',
      city: '',
      country_code: '',
    })
  })

  it('normalizes create and update params without leaking blank strings', () => {
    expect(
      toAddressCreateParams({
        type: 'home',
        label: '  Home  ',
        line1: '  ',
        line2: '',
        city: 'Kingston',
        countryCode: 'JM',
        postalCode: '',
        isDefault: true,
      })
    ).toEqual({
      type: 'home',
      label: 'Home',
      line1: null,
      line2: null,
      city: 'Kingston',
      countryCode: 'JM',
      postalCode: null,
      isDefault: true,
    })

    expect(
      toAddressUpdateParams({
        type: 'work',
        label: '',
        line1: '1 Main St',
        line2: 'Suite 2',
        city: '',
        country_code: 'US',
        postal_code: '10001',
        is_default: false,
      })
    ).toEqual({
      type: 'work',
      label: null,
      line1: '1 Main St',
      line2: 'Suite 2',
      city: null,
      country_code: 'US',
      postal_code: '10001',
      is_default: false,
    })
  })

  it('formats labels and summaries for table and overview displays', () => {
    expect(addressLabel(address)).toBe('Warehouse')
    expect(addressSummary(address)).toBe('Kingston, JM')
    expect(addressSummary({ ...address, country_code: null })).toBe('Kingston')
    expect(addressSummary({ ...address, city: null, country_code: 'us' })).toBe(
      'US'
    )
    expect(addressSummary({ ...address, city: null, country_code: null })).toBe(
      '-'
    )
    expect(addressPreviewSummary(address)).toBe('12 Ocean Ave, Kingston, JM')
    expect(formatAddressType('billing')).toBe('Billing')

    expect(addressLabel({ ...address, label: null, type: 'home' })).toBe(
      'Home address'
    )
    expect(
      addressPreviewSummary({
        ...address,
        line1: null,
        city: null,
        country_code: null,
      })
    ).toBe('-')
  })

  it('narrows only supported address types', () => {
    expect(isAddressType('billing')).toBe(true)
    expect(isAddressType('shipping')).toBe(true)
    expect(isAddressType('office')).toBe(false)
    expect(isAddressType(null)).toBe(false)
  })
})
