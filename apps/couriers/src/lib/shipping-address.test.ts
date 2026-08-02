import { describe, expect, it } from 'vitest'

import type { AddressView } from '@/types/address'
import type { WarehouseView } from '@/types/warehouse'

import { composeShippingAddress } from './shipping-address'

function createAddress(overrides: Partial<AddressView> = {}): AddressView {
  return {
    id: 'addr_7Kq2',
    tenantId: 'ten_4Bd9',
    name: 'Miami receiving',
    line1: '8200 NW 27th St',
    line2: null,
    city: 'Doral',
    regionCode: 'FL',
    regionName: 'Florida',
    countryCode: 'US',
    postalCode: '33122',
    latitude: null,
    longitude: null,
    isActive: true,
    createdAt: 1_785_000_000,
    updatedAt: 1_785_000_000,
    ...overrides,
  }
}

function createWarehouse(
  overrides: Partial<WarehouseView> = {}
): WarehouseView {
  return {
    id: 'wh_3Nm8',
    tenantId: 'ten_4Bd9',
    addressId: 'addr_7Kq2',
    orgLocationId: null,
    name: 'Miami',
    operatingModel: 'OWNED',
    agentName: null,
    code: 'JMC',
    mailboxPlacement: 'ADDRESS_LINE_2',
    mailboxPrefix: null,
    instructions: null,
    isActive: true,
    isPrimary: true,
    address: createAddress(),
    createdAt: 1_785_000_000,
    updatedAt: 1_785_000_000,
    ...overrides,
  }
}

describe('composeShippingAddress', () => {
  describe('placement', () => {
    it('appends the token to the recipient line for RECIPIENT_LINE', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({ mailboxPlacement: 'RECIPIENT_LINE' }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result).toEqual({
        recipient: 'Alejandra Reyes JMC 1042',
        line1: '8200 NW 27th St',
        line2: null,
        city: 'Doral',
        region: 'Florida',
        postalCode: '33122',
        country: 'US',
      })
    })

    it('appends the token to the first address line for ADDRESS_LINE_1', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({ mailboxPlacement: 'ADDRESS_LINE_1' }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result).toEqual({
        recipient: 'Alejandra Reyes',
        line1: '8200 NW 27th St, JMC 1042',
        line2: null,
        city: 'Doral',
        region: 'Florida',
        postalCode: '33122',
        country: 'US',
      })
    })

    it('puts the token on the second address line for ADDRESS_LINE_2', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({ mailboxPlacement: 'ADDRESS_LINE_2' }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result).toEqual({
        recipient: 'Alejandra Reyes',
        line1: '8200 NW 27th St',
        line2: 'JMC 1042',
        city: 'Doral',
        region: 'Florida',
        postalCode: '33122',
        country: 'US',
      })
    })

    it('appends to an existing line2 rather than replacing it', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({
          mailboxPlacement: 'ADDRESS_LINE_2',
          address: createAddress({ line2: 'Bay 14' }),
        }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.line2).toBe('Bay 14, JMC 1042')
    })

    it('keeps an existing line2 untouched when the token goes elsewhere', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({
          mailboxPlacement: 'ADDRESS_LINE_1',
          address: createAddress({ line2: 'Bay 14' }),
        }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.line1).toBe('8200 NW 27th St, JMC 1042')
      expect(result.line2).toBe('Bay 14')
    })
  })

  describe('mailbox token', () => {
    it('spaces the code from the number when no prefix is set', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({ code: 'JMC', mailboxPrefix: null }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.line2).toBe('JMC 1042')
    })

    it('spaces the prefix from the number without a stored trailing space', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({ code: null, mailboxPrefix: 'SUITE' }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.line2).toBe('SUITE 1042')
    })

    it('does not double the space when a prefix is stored with a trailing one', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({ code: null, mailboxPrefix: 'SUITE ' }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.line2).toBe('SUITE 1042')
    })

    it('is the bare mailbox number when neither code nor prefix is set', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({ code: null, mailboxPrefix: null }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.line2).toBe('1042')
    })

    it('single-spaces the code, the prefix and the number when all are set', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({ code: 'JMC', mailboxPrefix: 'SUITE' }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.line2).toBe('JMC SUITE 1042')
    })
  })

  describe('region', () => {
    it('falls back to the region code when no region name is stored', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({
          address: createAddress({ regionName: null, regionCode: 'FL' }),
        }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.region).toBe('FL')
    })

    it('is null when neither region field is stored', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({
          address: createAddress({ regionName: null, regionCode: null }),
        }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.region).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('is null for a postal code the address does not carry', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({
          address: createAddress({ postalCode: null }),
        }),
        mailboxNumber: '1042',
        customerName: 'Alejandra Reyes',
      })

      expect(result.postalCode).toBeNull()
    })

    it('trims whitespace around the customer name and mailbox number', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({ mailboxPlacement: 'RECIPIENT_LINE' }),
        mailboxNumber: '  1042  ',
        customerName: '  Alejandra Reyes  ',
      })

      expect(result.recipient).toBe('Alejandra Reyes JMC 1042')
    })

    it('emits no dangling separator when the mailbox number is blank', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({
          mailboxPlacement: 'ADDRESS_LINE_1',
          code: null,
          mailboxPrefix: null,
        }),
        mailboxNumber: '   ',
        customerName: 'Alejandra Reyes',
      })

      expect(result.line1).toBe('8200 NW 27th St')
      expect(result.line2).toBeNull()
    })

    it('does not leave a trailing space on the recipient with a blank token', () => {
      const result = composeShippingAddress({
        warehouse: createWarehouse({
          mailboxPlacement: 'RECIPIENT_LINE',
          code: null,
          mailboxPrefix: null,
        }),
        mailboxNumber: '   ',
        customerName: 'Alejandra Reyes',
      })

      expect(result.recipient).toBe('Alejandra Reyes')
    })
  })
})
