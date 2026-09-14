/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { Customer } from '@876/crm'

import { toCrmCustomerRow } from './customer-row'
import { RequestCustomersList } from './request-customers-list'
import { RequestFormsList } from './request-forms-list'

afterEach(cleanup)

const customer = {
  object: 'customer_profile',
  profile: {
    id: 'profile_1',
    tenantId: 'tenant_1',
    billingCustomerId: 'cus_1',
    ownerId: null,
    status: 'ACTIVE',
    createdAt: 1,
    updatedAt: 2,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
  },
  customer: {
    id: 'cus_1',
    customerType: 'EXTERNAL',
    customerKind: 'BUSINESS',
    name: 'Acme Limited',
    companyName: 'Acme Limited',
    firstName: null,
    lastName: null,
    email: 'billing@acme.test',
    phone: '876-555-0100',
    organizationId: null,
    userId: null,
    primaryContact: null,
  },
} satisfies Customer

describe('request index surfaces', () => {
  it('keeps the finance customer id when mapping a CRM customer profile', () => {
    expect(toCrmCustomerRow(customer)).toMatchObject({
      profileId: 'profile_1',
      billingCustomerId: 'cus_1',
      name: 'Acme Limited',
      isBusiness: true,
      status: 'ACTIVE',
    })
  })

  it('links a request customer to the existing finance customer Requests route', () => {
    render(
      <RequestCustomersList
        customers={[toCrmCustomerRow(customer)]}
        customerRequestsHrefBase="/customers"
      />
    )

    expect(
      screen.getByRole('link', { name: 'Open requests for Acme Limited' })
    ).toHaveAttribute('href', '/customers/cus_1/requests')
  })

  it('renders finance request forms read-only when no management base is supplied', () => {
    render(
      <RequestFormsList
        forms={[
          {
            id: 'form_1',
            name: 'Support intake',
            slug: 'support',
            status: 'PUBLISHED',
            version: 3,
            fieldCount: 4,
            updatedAt: 1,
          },
        ]}
      />
    )

    expect(screen.getByText('Support intake')).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('keeps CRM management rows clickable when a forms base is supplied', () => {
    render(
      <RequestFormsList
        forms={[
          {
            id: 'form_1',
            name: 'Support intake',
            slug: 'support',
            status: 'DRAFT',
            version: 1,
            fieldCount: 1,
            updatedAt: 1,
          },
        ]}
        formsHref="/forms"
      />
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/forms/form_1')
  })
})
