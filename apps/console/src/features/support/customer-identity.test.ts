import { describe, expect, it } from 'vitest'
import { resolveCustomerIdentity } from './customer-identity'

describe('resolveCustomerIdentity', () => {
  it('falls back to fallback name when customer is null', () => {
    const identity = resolveCustomerIdentity(null, 'cust_123')
    expect(identity.name).toBe('cust_123')
    expect(identity.legalName).toBeNull()
    expect(identity.isBusiness).toBe(false)
    expect(identity.contact).toBeNull()
    expect(identity.typeLabel).toBe('External customer')
  })

  it('resolves an individual customer correctly', () => {
    const identity = resolveCustomerIdentity(
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-0100',
        customerKind: 'INDIVIDUAL',
        customerType: 'CORE_USER',
      },
      'cust_123'
    )

    expect(identity.name).toBe('Jane Doe')
    expect(identity.legalName).toBeNull()
    expect(identity.isBusiness).toBe(false)
    expect(identity.email).toBe('jane@example.com')
    expect(identity.phone).toBe('555-0100')
    expect(identity.contact).toBeNull()
    expect(identity.typeLabel).toBe('876 user')
  })

  it('resolves a business customer with primary contact', () => {
    const identity = resolveCustomerIdentity(
      {
        name: 'Acme Corp',
        companyName: 'Acme International Ltd',
        customerKind: 'BUSINESS',
        customerType: 'CORE_ORGANIZATION',
        email: 'info@acme.com',
        phone: '555-0200',
        primaryContact: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@acme.com',
          mobilePhone: '555-0201',
          avatar: 'https://example.com/avatar.jpg',
        },
      },
      'cust_123'
    )

    expect(identity.name).toBe('Acme Corp')
    expect(identity.legalName).toBe('Acme International Ltd')
    expect(identity.isBusiness).toBe(true)
    expect(identity.email).toBe('info@acme.com')
    expect(identity.phone).toBe('555-0200')
    expect(identity.contact).toEqual({
      name: 'John Smith',
      email: 'john@acme.com',
      phone: '555-0201',
      userId: null,
      avatar: 'https://example.com/avatar.jpg',
    })
    expect(identity.typeLabel).toBe('876 organization')
  })
})
