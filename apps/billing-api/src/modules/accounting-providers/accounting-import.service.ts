import { AppHttpError } from '@/http/errors'
import { tenantAuthorizationByOrganizationId } from '@/modules/tenants'
import { nowUnixSeconds } from '@/platform/timestamps'
import { accountingProvider } from '@/providers/accounting'

import {
  findAccountingReferenceByExternalId,
  listAccountingReferencesByExternalIds,
  localAccountingResourceExists,
} from './accounting-import.repository'
import {
  removeAccountingReference,
  upsertAccountingReference,
} from './accounting-sync.repository'
import { zohoAccessContext } from './accounting-providers.service'

export const accountingImportResourceTypes = ['customer', 'item'] as const
export type AccountingImportResourceType =
  (typeof accountingImportResourceTypes)[number]

function error(code: string, message: string, httpStatus: number) {
  return new AppHttpError({ code, message, httpStatus })
}

async function tenantIdForOrganization(organizationId: string) {
  const tenant = await tenantAuthorizationByOrganizationId(organizationId)
  if (!tenant || !tenant.active)
    throw error(
      'billing/workspace-not-found',
      'The Billing workspace was not found.',
      404
    )
  return tenant.id
}

async function connectionContext(
  organizationId: string,
  connectionId: string
) {
  const tenantId = await tenantIdForOrganization(organizationId)
  const access = await zohoAccessContext(connectionId)
  if (access.row.tenantId !== tenantId)
    throw error(
      'billing/accounting-provider-connection-not-found',
      'Accounting provider connection not found.',
      404
    )
  return { tenantId, ...access }
}

function providerResource(
  providerKey: string,
  resourceType: AccountingImportResourceType
) {
  const adapter = accountingProvider(providerKey)
  return resourceType === 'customer' ? adapter.customers : adapter.items
}

function externalId(
  resourceType: AccountingImportResourceType,
  record: unknown
): string {
  const value = record as Record<string, unknown>
  const id =
    resourceType === 'customer' ? value.contact_id : value.item_id
  if (typeof id !== 'string' || !id)
    throw error(
      'billing/provider-invalid-response',
      'The accounting provider returned a resource without an identifier.',
      502
    )
  return id
}

function candidate(
  resourceType: AccountingImportResourceType,
  record: unknown,
  mappedResourceId: string | null
) {
  const value = record as Record<string, unknown>
  const id = externalId(resourceType, value)
  const nameValue =
    resourceType === 'customer' ? value.contact_name : value.name
  const secondaryValue =
    resourceType === 'customer'
      ? value.company_name ?? value.email ?? null
      : value.sku ?? null
  return {
    object: 'accounting-provider-import-candidate' as const,
    resourceType,
    externalId: id,
    name: typeof nameValue === 'string' ? nameValue : id,
    secondary:
      typeof secondaryValue === 'string' ? secondaryValue : null,
    status: typeof value.status === 'string' ? value.status : null,
    mappedResourceId,
  }
}

export async function listAccountingImportCandidates(params: {
  organizationId: string
  connectionId: string
  resourceType: AccountingImportResourceType
  page: number
  perPage: number
}) {
  const { row, ctx } = await connectionContext(
    params.organizationId,
    params.connectionId
  )
  const page = await providerResource(row.provider.key, params.resourceType).list(
    ctx,
    { page: params.page, perPage: params.perPage }
  )
  const externalIds = page.data.map((record) =>
    externalId(params.resourceType, record)
  )
  const references = await listAccountingReferencesByExternalIds({
    connectionId: params.connectionId,
    resourceType: params.resourceType,
    externalIds,
  })
  const mapped = new Map(
    references.map((reference) => [reference.externalId, reference.resourceId])
  )
  return {
    object: 'list' as const,
    data: page.data.map((record) => {
      const id = externalId(params.resourceType, record)
      return candidate(params.resourceType, record, mapped.get(id) ?? null)
    }),
    has_more: page.hasMore,
    total_count: null,
    url: `/api/v1/admin/organizations/${params.organizationId}/accounting-provider-connections/${params.connectionId}/imports/${params.resourceType}`,
  }
}

export async function adoptAccountingProviderResource(params: {
  organizationId: string
  connectionId: string
  resourceType: AccountingImportResourceType
  resourceId: string
  externalId: string
}) {
  const { tenantId, row, ctx } = await connectionContext(
    params.organizationId,
    params.connectionId
  )
  if (
    !(await localAccountingResourceExists(
      tenantId,
      params.resourceType,
      params.resourceId
    ))
  )
    throw error(
      `${params.resourceType}/not-found`,
      `${params.resourceType === 'customer' ? 'Customer' : 'Item'} not found.`,
      404
    )

  await providerResource(row.provider.key, params.resourceType).retrieve(
    ctx,
    params.externalId
  )
  const existing = await findAccountingReferenceByExternalId({
    connectionId: params.connectionId,
    resourceType: params.resourceType,
    externalId: params.externalId,
  })
  if (existing && existing.resourceId !== params.resourceId)
    throw error(
      'billing/accounting-provider-resource-already-adopted',
      'This provider resource is already mapped to another Billing resource.',
      409
    )

  await upsertAccountingReference({
    tenantId,
    connectionId: params.connectionId,
    provider: row.provider.key,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    externalType: params.resourceType === 'customer' ? 'contact' : 'item',
    externalId: params.externalId,
    now: nowUnixSeconds(),
  })
  return {
    object: 'accounting-provider-adoption' as const,
    connectionId: params.connectionId,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    externalId: params.externalId,
  }
}

export async function releaseAccountingProviderResource(params: {
  organizationId: string
  connectionId: string
  resourceType: AccountingImportResourceType
  resourceId: string
}) {
  const { tenantId } = await connectionContext(
    params.organizationId,
    params.connectionId
  )
  const removed = await removeAccountingReference(
    params.connectionId,
    params.resourceType,
    params.resourceId
  )
  if (!removed.count)
    throw error(
      'billing/accounting-provider-adoption-not-found',
      'Accounting provider adoption not found.',
      404
    )
  return {
    object: 'accounting-provider-adoption' as const,
    connectionId: params.connectionId,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    deleted: true as const,
    tenantId,
  }
}
