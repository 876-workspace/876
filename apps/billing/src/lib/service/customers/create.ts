import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransaction } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { CustomerCreateParams } from '@/types/customer'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'
import {
  attributionData,
  type AttributedCreateResult,
  type IntegrationAttribution,
  resolveIdempotencyReplay,
} from '../integrations/attribution'

/** Creates an external or optionally core-linked Billing customer. */
export async function create(
  tenantId: string,
  params: CustomerCreateParams,
  attribution?: IntegrationAttribution,
  database: PrismaTransaction = prisma
): ServiceResult<AttributedCreateResult> {
  const replay = attribution
    ? resolveIdempotencyReplay(
        await findByIdempotencyKey(database, tenantId, attribution),
        attribution
      )
    : null
  if (replay) return replay

  const tenant = await database.tenant.findUnique({
    where: { id: tenantId },
    select: { defaultCurrency: true, defaultLanguage: true },
  })
  if (!tenant) return err('Workspace not found.', 404)

  // Currency and language inherit the workspace defaults when unspecified.
  const currency = params.currency ?? tenant.defaultCurrency
  const language = params.language ?? tenant.defaultLanguage

  if (!(await hasEnabledCurrency(tenantId, currency, database)))
    return err('Enable the customer currency before using it.', 422)

  const [paymentTerm, salesperson, priceList] = await Promise.all([
    params.paymentTermId
      ? database.paymentTerm.findFirst({
          where: { id: params.paymentTermId, tenantId, isActive: true },
          select: { id: true },
        })
      : null,
    params.salespersonId
      ? database.salesperson.findFirst({
          where: { id: params.salespersonId, tenantId, isActive: true },
          select: { id: true },
        })
      : null,
    params.priceListId
      ? database.priceList.findFirst({
          where: { id: params.priceListId, tenantId, isActive: true },
          select: { id: true },
        })
      : null,
  ])
  if (params.paymentTermId && !paymentTerm)
    return err('Payment term not found.', 404)
  if (params.salespersonId && !salesperson)
    return err('Salesperson not found.', 404)
  if (params.priceListId && !priceList)
    return err('Active price list not found.', 404)

  try {
    const now = nowUnixSeconds()
    const customer = await database.customer.create({
      data: {
        id: generateId('Customer'),
        tenantId,
        customerType: params.customerType,
        customerKind: params.customerKind,
        organizationId: params.organizationId ?? null,
        userId: params.userId ?? null,
        externalReference: params.externalReference ?? null,
        ...attributionData(attribution),
        customerNumber: params.customerNumber ?? null,
        name: params.name,
        salutation: params.salutation ?? null,
        firstName: params.firstName ?? null,
        lastName: params.lastName ?? null,
        companyName: params.companyName ?? null,
        email: params.email ?? null,
        phone: params.phone ?? null,
        workPhone: params.workPhone ?? null,
        website: params.website ?? null,
        notes: params.notes ?? null,
        taxRegistrationNumber: params.taxRegistrationNumber ?? null,
        defaultCurrency: currency,
        language,
        paymentTermId: paymentTerm?.id ?? null,
        salespersonId: salesperson?.id ?? null,
        ...(priceList ? { priceListId: priceList.id } : {}),
        taxBehaviorOverride: params.taxBehaviorOverride ?? null,
        lateFeeExempt: params.lateFeeExempt ?? false,
        invoiceNotes: params.invoiceNotes ?? null,
        invoiceTerms: params.invoiceTerms ?? null,
        coreSyncedAt: params.customerType === 'EXTERNAL' ? null : now,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    })

    return ok({ id: customer.id })
  } catch (error) {
    if (isUniqueConstraintError(error) && attribution) {
      const replayAfterConflict = resolveIdempotencyReplay(
        await findByIdempotencyKey(database, tenantId, attribution),
        attribution
      )
      if (replayAfterConflict) return replayAfterConflict

      if (
        attribution.sourceExternalReference &&
        (await database.customer.findFirst({
          where: {
            tenantId,
            sourceAppId: attribution.sourceAppId,
            sourceExternalReference: attribution.sourceExternalReference,
          },
          select: { id: true },
        }))
      )
        return err(
          'A customer already exists for this source external reference.',
          409
        )
    }

    if (isUniqueConstraintError(error) && params.customerNumber)
      return err(
        'A customer with this customer number already exists in this workspace.',
        409
      )

    if (isUniqueConstraintError(error))
      return err(
        'This core reference or external reference is already a customer.',
        409
      )

    console.error('[billing.service.customers.create]', error)
    return err('Failed to create the customer.', 500)
  }
}

function findByIdempotencyKey(
  database: PrismaTransaction,
  tenantId: string,
  attribution: IntegrationAttribution
) {
  return database.customer.findFirst({
    where: {
      tenantId,
      sourceAppId: attribution.sourceAppId,
      sourceIdempotencyKey: attribution.sourceIdempotencyKey,
    },
    select: { id: true, sourcePayloadHash: true },
  })
}
