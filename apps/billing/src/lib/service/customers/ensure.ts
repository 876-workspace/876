import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { CustomerEnsureParams } from '@/types/sync'

import { ok } from '../result'
import { create } from './create'

/** Idempotently creates the Billing customer mirroring a core 876 organization or user. */
export async function ensure(
  tenantId: string,
  params: CustomerEnsureParams
): ServiceResult<{ id: string }> {
  const isOrganization = params.customerType === 'CORE_ORGANIZATION'
  const identity = isOrganization
    ? { tenantId, organizationId: params.organizationId }
    : { tenantId, userId: params.userId }

  const existing = await prisma.customer.findFirst({
    where: identity,
    select: { id: true },
  })
  if (existing) {
    await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: params.name,
        email: params.email ?? null,
        updatedAt: nowUnixSeconds(),
      },
    })
    return ok({ id: existing.id })
  }

  const result = await create(tenantId, {
    name: params.name,
    customerKind: isOrganization ? 'BUSINESS' : 'INDIVIDUAL',
    email: params.email ?? null,
    phone: null,
    currency: null,
    customerType: params.customerType,
    organizationId: isOrganization ? (params.organizationId ?? null) : null,
    userId: isOrganization ? null : (params.userId ?? null),
    externalReference: null,
    lateFeeExempt: false,
  })
  if (result.error === null) return result

  if (result.status === 409) {
    const raced = await prisma.customer.findFirst({
      where: identity,
      select: { id: true },
    })
    if (raced) return ok({ id: raced.id })
    return result
  }

  return result
}
