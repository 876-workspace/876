import 'server-only'

import type { BillingIntegrationClient } from '@876/billing/integration'

export type CustomerKind = 'INDIVIDUAL' | 'BUSINESS'

function resolveName(params: {
  customerKind: CustomerKind
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
}) {
  const person = [params.firstName, params.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ')
  const company = params.companyName?.trim() ?? ''
  return params.customerKind === 'BUSINESS' ? company || person : person || company
}

export function createExternalCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  params: {
    idempotencyKey: string
    customerKind: CustomerKind
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
  }
) {
  const key = `crm:create:${params.idempotencyKey}`
  return finance.customers.create(
    organizationId,
    {
      customerType: 'EXTERNAL',
      customerKind: params.customerKind,
      name: resolveName(params),
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
      companyName: params.companyName ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      sourceExternalReference: key,
    },
    { idempotencyKey: key }
  )
}

export function updateExternalCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  customerId: string,
  params: {
    customerKind: CustomerKind
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
  }
) {
  const name = resolveName(params)
  return finance.customers.update(organizationId, customerId, {
    firstName: params.firstName ?? null,
    lastName: params.lastName ?? null,
    companyName: params.companyName ?? null,
    email: params.email ?? null,
    phone: params.phone ?? null,
    ...(name ? { name } : {}),
  })
}
