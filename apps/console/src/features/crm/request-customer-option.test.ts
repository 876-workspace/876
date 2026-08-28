import { describe, expect, it } from 'vitest'

import {
  searchRequestCustomers,
  type RequestCustomerOption,
} from './request-customer-option'

const customers: RequestCustomerOption[] = [
  {
    id: 'cus_business',
    name: 'Island Logistics',
    legalName: 'Island Logistics Limited',
    isBusiness: true,
    email: 'support@island.example',
    phone: '+1 246 555 0100',
    contactName: 'Taylor Jordan',
    typeLabel: 'External customer',
    status: 'ACTIVE',
  },
  {
    id: 'cus_person',
    name: 'Morgan Lee',
    legalName: null,
    isBusiness: false,
    email: 'morgan@example.com',
    phone: null,
    contactName: null,
    typeLabel: '876 user',
    status: 'ACTIVE',
  },
]

describe('searchRequestCustomers', () => {
  it('finds customers by display name without matching case', () => {
    expect(searchRequestCustomers(customers, 'isLAND')).toEqual([customers[0]])
  })

  it('also finds a business by its primary contact or email', () => {
    expect(searchRequestCustomers(customers, 'taylor')).toEqual([customers[0]])
    expect(searchRequestCustomers(customers, 'morgan@')).toEqual([customers[1]])
  })
})
