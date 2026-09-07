import { getError, isError } from '@876/core'

import * as categories from '../categories/index.js'
import * as customers from '../customers/index.js'
import * as requests from '../requests/index.js'
import type { CreateSupportRequestInput } from './support.schemas.js'

function supportOrganizationId(): string | null {
  return process.env.CRM_SUPPORT_ORGANIZATION_ID?.trim() || null
}

async function findSourceCustomer(
  targetOrganizationId: string,
  sourceOrganizationId: string
) {
  const result = await customers.list(targetOrganizationId, {
    customerOrganizationId: sourceOrganizationId,
  })
  if (isError(result)) return result
  return result.customers[0] ?? null
}

async function ensureSourceCustomer(
  targetOrganizationId: string,
  sourceOrganizationId: string,
  sourceOrganizationName: string
) {
  const existing = await findSourceCustomer(
    targetOrganizationId,
    sourceOrganizationId
  )
  if (isError(existing) || existing) return existing

  return customers.create(targetOrganizationId, {
    idempotencyKey: `platform-support:${sourceOrganizationId}`,
    customerKind: 'BUSINESS',
    organizationId: sourceOrganizationId,
    companyName: sourceOrganizationName,
  })
}

export async function listCategories() {
  const targetOrganizationId = supportOrganizationId()
  if (!targetOrganizationId) return getError('crm/not-configured')

  const result = await categories.list(targetOrganizationId)
  if (isError(result)) return result
  return result.filter((category) => category.isActive)
}

export async function listRequests(sourceOrganizationId: string) {
  const targetOrganizationId = supportOrganizationId()
  if (!targetOrganizationId) return getError('crm/not-configured')

  const customer = await findSourceCustomer(
    targetOrganizationId,
    sourceOrganizationId
  )
  if (isError(customer)) return customer
  if (!customer) return []

  return requests.list(targetOrganizationId, {
    customerId: customer.profile.id,
  })
}

export async function createRequest(input: CreateSupportRequestInput) {
  const targetOrganizationId = supportOrganizationId()
  if (!targetOrganizationId) return getError('crm/not-configured')

  const customer = await ensureSourceCustomer(
    targetOrganizationId,
    input.sourceOrganizationId,
    input.sourceOrganizationName
  )
  if (isError(customer)) return customer

  return requests.create(targetOrganizationId, {
    customerId: customer.profile.id,
    subject: input.subject,
    description: input.description ?? null,
    categoryId: input.categoryId ?? null,
    channel: 'WIDGET',
    requesterUserId: input.requesterUserId,
    createdBy: input.requesterUserId,
  })
}
