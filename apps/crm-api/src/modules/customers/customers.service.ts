import { create876BillingIntegrationClient } from '@876/billing/integration'

import * as repository from './customers.repository.js'
import type { CreateCustomerInput, UpdateCustomerInput } from './customers.schemas.js'

function finance() {
  return create876BillingIntegrationClient({
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.CRM_API_876_KEY,
  })
}

function resolveName(params: {
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
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

export async function list(organizationId: string) {
  const profiles = await repository.list(organizationId)
  if (!profiles.length) return []

  const result = await finance().customers.list(organizationId, {
    ids: profiles.map((profile) => profile.billingCustomerId),
    limit: Math.min(profiles.length, 100),
  })
  if (result.error) throw new Error(result.error.message)

  const byId = new Map(result.data.data.map((customer) => [customer.id, customer]))
  return profiles.map((profile) => ({
    profile,
    customer: byId.get(profile.billingCustomerId) ?? null,
  }))
}

export async function retrieve(organizationId: string, id: string) {
  const profile = await repository.retrieve(organizationId, id)
  if (!profile) return null

  const result = await finance().customers.list(organizationId, {
    ids: [profile.billingCustomerId],
    limit: 1,
  })
  if (result.error) throw new Error(result.error.message)

  return { profile, customer: result.data.data[0] ?? null }
}

export async function create(organizationId: string, input: CreateCustomerInput) {
  const key = `crm:create:${input.idempotencyKey}`
  const shared = await finance().customers.create(
    organizationId,
    {
      customerType: 'EXTERNAL',
      customerKind: input.customerKind,
      name: resolveName(input),
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      companyName: input.companyName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      sourceExternalReference: key,
    },
    { idempotencyKey: key }
  )
  if (shared.error) throw new Error(shared.error.message)

  const profile = await repository.create({
    organizationId,
    billingCustomerId: shared.data.id,
    ownerId: input.ownerId ?? null,
  })
  return { profile, customer: shared.data }
}

export async function update(
  organizationId: string,
  id: string,
  input: UpdateCustomerInput
) {
  const current = await retrieve(organizationId, id)
  if (!current) return null

  let customer = current.customer
  if (customer?.customerType === 'EXTERNAL') {
    const shared = await finance().customers.update(
      organizationId,
      current.profile.billingCustomerId,
      {
        name: resolveName(input),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        companyName: input.companyName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
      }
    )
    if (shared.error) throw new Error(shared.error.message)
    customer = shared.data
  }

  const profile = await repository.update(current.profile.id, {
    ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
    ...(input.status ? { status: input.status } : {}),
  })
  return { profile, customer }
}

export async function remove(
  organizationId: string,
  id: string,
  params: { deletedBy: string; reason?: string | null }
) {
  const current = await repository.retrieve(organizationId, id)
  if (!current) return null
  return repository.remove({ id: current.id, ...params })
}
