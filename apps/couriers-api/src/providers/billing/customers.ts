import { create876BillingIntegrationClient } from '@876/billing/integration'

import { getSettings } from '@/config'
import { getRequestId } from '@/platform/logger'

function billingClient() {
  const settings = getSettings()
  return create876BillingIntegrationClient({
    baseUrl: settings.billingApiUrl,
    apiKey: settings.api876Key,
    requestId: getRequestId() || undefined,
  })
}

type CustomerKind = 'INDIVIDUAL' | 'BUSINESS'

type CustomerNameParts = {
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
}

function resolveCustomerName(
  customerKind: CustomerKind,
  parts: CustomerNameParts
): string {
  const person = [parts.firstName, parts.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  const company = parts.companyName?.trim() ?? ''

  return customerKind === 'BUSINESS' ? company || person : person || company
}

export async function createExternalCustomer(
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
  const name = resolveCustomerName(params.customerKind, params)
  const key = `couriers:create:${params.idempotencyKey}`

  return billingClient().customers.create(
    organizationId,
    {
      customerType: 'EXTERNAL',
      customerKind: params.customerKind,
      name,
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

export async function retrieveCustomer(
  organizationId: string,
  customerId: string
) {
  return billingClient().customers.retrieve(organizationId, customerId)
}

export async function updateExternalCustomer(
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
  const { customerKind, ...fields } = params
  const name = resolveCustomerName(customerKind, fields)
  return billingClient().customers.update(organizationId, customerId, {
    ...fields,
    ...(name ? { name } : {}),
  })
}
