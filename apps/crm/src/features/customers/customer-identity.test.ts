import { describe, expect, it } from 'vitest'

import type { RegistryCustomer } from '@876/crm'

import { resolveCustomerIdentity } from './customer-identity'

function businessCustomer(
  overrides: Partial<RegistryCustomer> = {}
): RegistryCustomer {
  return {
    id: 'cust_dd63b6ea',
    customerType: 'CORE_ORGANIZATION',
    customerKind: 'BUSINESS',
    name: 'Efesto Technologies',
    companyName: 'Efesto Technologies, Inc',
    email: 'accounts@efesto.test',
    phone: '+18765550100',
    organizationId: 'org_ee4109ac',
    primaryContact: {
      object: 'contact',
      id: 'contact_ac3ae55b',
      userId: 'user_a8599055',
      firstName: 'Raheem',
      lastName: 'McDonald',
      email: 'raheem@personal.test',
      workPhone: null,
      mobilePhone: '+18765550199',
      avatar: 'https://cdn.876.test/u/raheem.png',
      isPrimary: true,
    },
    ...overrides,
  } as RegistryCustomer
}

function individualCustomer(
  overrides: Partial<RegistryCustomer> = {}
): RegistryCustomer {
  return {
    id: 'cust_b71af1a7',
    customerType: 'EXTERNAL',
    customerKind: 'INDIVIDUAL',
    name: 'Alejandra Reyes',
    firstName: 'Alejandra',
    lastName: 'Reyes',
    companyName: null,
    email: 'alejandra@example.com',
    phone: '+18765550123',
    primaryContact: null,
    ...overrides,
  } as RegistryCustomer
}

describe('resolveCustomerIdentity', () => {
  describe('business customers', () => {
    it('keeps the organization email out of the contact and vice versa', () => {
      const identity = resolveCustomerIdentity(businessCustomer(), 'fallback')

      // The defect this exists to prevent: the contact's personal address
      // rendering as the organization's own.
      expect(identity.email).toBe('accounts@efesto.test')
      expect(identity.contact?.email).toBe('raheem@personal.test')
      expect(identity.phone).toBe('+18765550100')
      expect(identity.contact?.phone).toBe('+18765550199')
    })

    it('reports the party as a business and names it by its trading name', () => {
      const identity = resolveCustomerIdentity(businessCustomer(), 'fallback')

      expect(identity.isBusiness).toBe(true)
      expect(identity.name).toBe('Efesto Technologies')
      expect(identity.legalName).toBe('Efesto Technologies, Inc')
    })

    it('suppresses the legal name when it merely repeats the display name', () => {
      const identity = resolveCustomerIdentity(
        businessCustomer({ companyName: 'Efesto Technologies' }),
        'fallback'
      )

      // Printing the same string twice reads as a rendering bug.
      expect(identity.legalName).toBeNull()
    })

    it('builds the contact name from the contact, never the party record', () => {
      const identity = resolveCustomerIdentity(
        businessCustomer({ firstName: 'Someone', lastName: 'Else' }),
        'fallback'
      )

      expect(identity.contact?.name).toBe('Raheem McDonald')
    })

    it('carries the contact avatar through', () => {
      const identity = resolveCustomerIdentity(businessCustomer(), 'fallback')

      expect(identity.contact?.avatar).toBe('https://cdn.876.test/u/raheem.png')
      expect(identity.contact?.userId).toBe('user_a8599055')
    })

    it('falls back to the contact email when they have no name on file', () => {
      const identity = resolveCustomerIdentity(
        businessCustomer({
          primaryContact: {
            object: 'contact',
            id: 'contact_1',
            userId: null,
            firstName: null,
            lastName: null,
            email: 'ap@efesto.test',
            workPhone: null,
            mobilePhone: null,
            avatar: null,
            isPrimary: true,
          },
        } as Partial<RegistryCustomer>),
        'fallback'
      )

      expect(identity.contact?.name).toBe('ap@efesto.test')
    })

    it('reports no contact when the organization has none', () => {
      const identity = resolveCustomerIdentity(
        businessCustomer({ primaryContact: null }),
        'fallback'
      )

      expect(identity.contact).toBeNull()
      expect(identity.email).toBe('accounts@efesto.test')
    })

    it('prefers the mobile number, then the work number', () => {
      const identity = resolveCustomerIdentity(
        businessCustomer({
          primaryContact: {
            object: 'contact',
            id: 'contact_1',
            userId: null,
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: null,
            workPhone: '+18765550777',
            mobilePhone: null,
            avatar: null,
            isPrimary: true,
          },
        } as Partial<RegistryCustomer>),
        'fallback'
      )

      expect(identity.contact?.phone).toBe('+18765550777')
    })

    it("leaves a missing organization email null rather than borrowing the contact's", () => {
      const identity = resolveCustomerIdentity(
        businessCustomer({ email: null, phone: null }),
        'fallback'
      )

      expect(identity.email).toBeNull()
      expect(identity.phone).toBeNull()
      expect(identity.contact?.email).toBe('raheem@personal.test')
    })
  })

  describe('individual customers', () => {
    it('treats the person as their own contact and renders no second party', () => {
      const identity = resolveCustomerIdentity(individualCustomer(), 'fallback')

      expect(identity.isBusiness).toBe(false)
      expect(identity.contact).toBeNull()
      expect(identity.email).toBe('alejandra@example.com')
    })

    it('ignores a stray contact row on an individual', () => {
      const identity = resolveCustomerIdentity(
        individualCustomer({
          primaryContact: {
            object: 'contact',
            id: 'contact_1',
            userId: null,
            firstName: 'Someone',
            lastName: 'Else',
            email: 'someone@example.com',
            workPhone: null,
            mobilePhone: null,
            avatar: null,
            isPrimary: true,
          },
        } as Partial<RegistryCustomer>),
        'fallback'
      )

      // Rendering a second block would show the same human twice.
      expect(identity.contact).toBeNull()
    })
  })

  describe('missing or malformed registry data', () => {
    it('falls back to the supplied name when the registry read returned nothing', () => {
      const identity = resolveCustomerIdentity(null, 'cust_dd63b6ea')

      expect(identity.name).toBe('cust_dd63b6ea')
      expect(identity.isBusiness).toBe(false)
      expect(identity.contact).toBeNull()
      expect(identity.email).toBeNull()
      expect(identity.legalName).toBeNull()
    })

    it('falls back when the party name is blank rather than rendering empty', () => {
      const identity = resolveCustomerIdentity(
        businessCustomer({ name: '   ' }),
        'cust_dd63b6ea'
      )

      expect(identity.name).toBe('cust_dd63b6ea')
    })

    it('labels how the party links to 876 identity', () => {
      expect(resolveCustomerIdentity(businessCustomer(), 'x').typeLabel).toBe(
        '876 organization'
      )
      expect(
        resolveCustomerIdentity(
          individualCustomer({ customerType: 'CORE_USER' }),
          'x'
        ).typeLabel
      ).toBe('876 user')
      expect(resolveCustomerIdentity(individualCustomer(), 'x').typeLabel).toBe(
        'External customer'
      )
    })
  })
})
