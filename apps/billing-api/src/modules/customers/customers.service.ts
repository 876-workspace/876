import { getSettings } from '@/config'
import type { Prisma } from '@/db'
import { AppHttpError } from '@/http/errors'
import type { IntegrationAttribution } from '@/http/integration/idempotency'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createCustomerRow,
  deleteCustomerRow,
  ensureCoreCustomerRows,
  findCoreCustomer,
  findCustomerDetailRow,
  findCustomerRow,
  findIdempotentCustomerRow,
  listCustomerLedgerRows,
  listDocumentRecipientRows,
  listCustomerRows,
  recordOpeningBalanceRows,
  resolveEnsureTenant,
  updateCustomerLinkRow,
  updateCustomerRow,
} from './customers.repository'
import { importCustomerRows } from './customers-import.repository'
import type {
  CustomerCreateBody,
  CustomerEnsureBody,
  CustomerImportBody,
  CustomerListQuery,
  CustomerUpdateBody,
  LinkCustomerBody,
  OpeningBalanceBody,
} from './customers.schemas'
import {
  serializeCustomer,
  serializeCustomerDetail,
  serializeLedgerEntry,
} from './customers.serializers'

function notFound() {
  return new AppHttpError({
    code: 'customer/not-found',
    message: 'Customer not found.',
    httpStatus: 404,
  })
}

export function listDocumentRecipients(tenantId: string) {
  return listDocumentRecipientRows(tenantId)
}

function invalid(message: string) {
  return new AppHttpError({
    code: 'validation/invalid-request',
    message,
    httpStatus: 422,
  })
}

async function validateCustomer(
  tenantId: string,
  body: CustomerCreateBody | CustomerUpdateBody
) {
  if (body.currency && !(await hasEnabledCurrency(tenantId, body.currency))) {
    throw invalid('Enable the customer currency before using it.')
  }
  if (
    'customerType' in body &&
    body.customerType === 'CORE_USER' &&
    !body.userId
  )
    throw invalid('userId is required for a CORE_USER customer.')
  if (
    'customerType' in body &&
    body.customerType === 'CORE_ORGANIZATION' &&
    !body.organizationId
  )
    throw invalid(
      'organizationId is required for a CORE_ORGANIZATION customer.'
    )
}

export async function listCustomers(
  tenantId: string,
  query: CustomerListQuery,
  sourceAppId?: string
) {
  const rows = await listCustomerRows(tenantId, query, sourceAppId)
  const hasMore = rows.length > query.limit
  return {
    object: 'list' as const,
    data: rows.slice(0, query.limit).map(serializeCustomer),
    has_more: hasMore,
    total_count: null,
    url: sourceAppId ? '/api/v1/integrations/customers' : '/api/v1/customers',
  }
}

export async function retrieveCustomer(
  tenantId: string,
  id: string,
  sourceAppId?: string
) {
  const row = await findCustomerDetailRow(tenantId, id, sourceAppId)
  if (!row) throw notFound()
  return serializeCustomerDetail(row)
}

export async function createCustomer(
  tenantId: string,
  body: CustomerCreateBody,
  attribution?: IntegrationAttribution | null
): Promise<{
  customer: ReturnType<typeof serializeCustomer>
  replayed: boolean
}> {
  await validateCustomer(tenantId, body)
  if (attribution) {
    const existing = await findIdempotentCustomerRow(
      tenantId,
      attribution.sourceAppId,
      attribution.sourceIdempotencyKey
    )
    if (existing) {
      if (existing.sourcePayloadHash !== attribution.sourcePayloadHash) {
        throw new AppHttpError({
          code: 'billing/idempotency-conflict',
          message:
            'The idempotency key was already used with a different payload.',
          httpStatus: 409,
        })
      }
      return { customer: serializeCustomer(existing), replayed: true }
    }
  }
  const now = nowUnixSeconds()
  const data: Prisma.CustomerUncheckedCreateInput = {
    id: generateId('cust'),
    tenantId,
    name: body.name,
    customerKind: body.customerKind,
    customerType: body.customerType,
    organizationId: body.organizationId ?? null,
    userId: body.userId ?? null,
    externalReference: attribution ? null : (body.externalReference ?? null),
    sourceAppId: attribution?.sourceAppId ?? null,
    sourceExternalReference: attribution?.sourceExternalReference ?? null,
    sourceIdempotencyKey: attribution?.sourceIdempotencyKey ?? null,
    sourcePayloadHash: attribution?.sourcePayloadHash ?? null,
    salutation: body.salutation ?? null,
    firstName: body.firstName ?? null,
    lastName: body.lastName ?? null,
    companyName: body.companyName ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    workPhone: body.workPhone ?? null,
    defaultCurrency: body.currency ?? null,
    language: body.language ?? null,
    paymentTermId: body.paymentTermId ?? null,
    salespersonId: body.salespersonId ?? null,
    priceListId: body.priceListId ?? null,
    taxBehaviorOverride: body.taxBehaviorOverride ?? null,
    lateFeeExempt: body.lateFeeExempt,
    invoiceNotes: body.invoiceNotes ?? null,
    invoiceTerms: body.invoiceTerms ?? null,
    createdAt: now,
    updatedAt: now,
  }
  try {
    return {
      customer: serializeCustomer(await createCustomerRow(data)),
      replayed: false,
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new AppHttpError({
        code: 'customer/conflict',
        message:
          'A customer with this identity or external reference already exists.',
        httpStatus: 409,
      })
    }
    throw error
  }
}

export async function updateCustomer(
  tenantId: string,
  id: string,
  body: CustomerUpdateBody,
  sourceAppId?: string
) {
  await validateCustomer(tenantId, body)
  const row = await updateCustomerRow(
    tenantId,
    id,
    { ...body, updatedAt: nowUnixSeconds() },
    sourceAppId
  )
  if (!row) throw notFound()
  return serializeCustomer(row)
}

export async function deleteCustomer(
  tenantId: string,
  id: string,
  sourceAppId?: string
) {
  if (!(await deleteCustomerRow(tenantId, id, sourceAppId))) throw notFound()
  return { object: 'customer' as const, id, deleted: true as const }
}

export async function customerAccount(tenantId: string, id: string) {
  const customer = await retrieveCustomer(tenantId, id)
  const entries = await listCustomerLedgerRows(tenantId, id)
  return {
    object: 'customer_account' as const,
    customer,
    outstandingReceivable: customer.outstandingReceivable,
    unusedCredits: customer.unusedCredits,
    entries: entries.map(serializeLedgerEntry),
  }
}

export async function linkCustomer(
  tenantId: string,
  id: string,
  body: LinkCustomerBody
) {
  const row = await updateCustomerLinkRow(tenantId, id, {
    customerType: body.customerType,
    organizationId:
      body.customerType === 'CORE_ORGANIZATION'
        ? (body.organizationId ?? null)
        : null,
    userId: body.customerType === 'CORE_USER' ? (body.userId ?? null) : null,
    updatedAt: nowUnixSeconds(),
  })
  if (!row) throw notFound()
  return serializeCustomer(row)
}

export async function unlinkCustomer(tenantId: string, id: string) {
  const row = await updateCustomerLinkRow(tenantId, id, {
    customerType: 'EXTERNAL',
    organizationId: null,
    userId: null,
    updatedAt: nowUnixSeconds(),
  })
  if (!row) throw notFound()
  return serializeCustomer(row)
}

export async function recordOpeningBalance(
  tenantId: string,
  id: string,
  body: OpeningBalanceBody
) {
  const result = await recordOpeningBalanceRows(
    tenantId,
    id,
    body,
    {
      invoiceId: generateId('inv'),
      lineId: generateId('invline'),
      ledgerId: generateId('ledger'),
    },
    nowUnixSeconds()
  )
  if (result.kind === 'currency')
    throw invalid('Enable the opening-balance currency before using it.')
  if (result.kind === 'customer') throw notFound()
  return { object: 'invoice' as const, id: result.invoiceId }
}

export async function importCustomers(
  tenantId: string,
  body: CustomerImportBody
) {
  const rows = await importCustomerRows(tenantId, body, nowUnixSeconds())
  if (!rows) throw notFound()
  return {
    object: 'customer_import' as const,
    total: rows.length,
    imported: rows.filter((row) => row.status === 'imported').length,
    skipped: rows.filter((row) => row.status === 'skipped').length,
    failed: rows.filter((row) => row.status === 'failed').length,
    rows,
  }
}

export async function ensureCoreCustomer(body: CustomerEnsureBody) {
  if (body.customerType === 'CORE_ORGANIZATION' && !body.organizationId)
    throw invalid(
      'organizationId is required for a CORE_ORGANIZATION customer.'
    )
  if (body.customerType === 'CORE_USER' && !body.userId)
    throw invalid('userId is required for a CORE_USER customer.')
  const settings = getSettings()
  if (!body.tenantId && !body.tenantSlug && !settings.platformTenantSlug) {
    throw new AppHttpError({
      code: 'billing/platform-tenant-unconfigured',
      message:
        'Set BILLING_PLATFORM_TENANT_SLUG to receive platform customer events.',
      httpStatus: 503,
    })
  }
  const tenant = await resolveEnsureTenant(body, settings.platformTenantSlug)
  if (!tenant)
    throw new AppHttpError({
      code: body.tenantId
        ? 'billing/tenant-not-found'
        : 'billing/platform-tenant-not-found',
      message: body.tenantId
        ? 'The requested Billing workspace was not found.'
        : 'No Billing workspace matches the configured platform slug.',
      httpStatus: body.tenantId ? 404 : 503,
    })
  // An organization is never a customer of the workspace it owns. On the
  // platform (operator) tenant this is what keeps 876 itself out of its own
  // customer list; on any org's own workspace it keeps that org from appearing
  // as its own customer. Requires the tenant's organizationId to be set.
  if (
    body.customerType === 'CORE_ORGANIZATION' &&
    tenant.organizationId != null &&
    body.organizationId === tenant.organizationId
  )
    return { object: 'acknowledgement' as const, id: null, created: false }

  const existing = await findCoreCustomer(tenant.id, body)
  if (!existing && body.status === 'ARCHIVED')
    return { object: 'acknowledgement' as const, id: null, created: false }
  const row = await ensureCoreCustomerRows(
    tenant,
    existing?.id ?? null,
    body,
    generateId('cust'),
    generateId('contact'),
    nowUnixSeconds()
  )
  return { object: 'customer' as const, id: row.id }
}
