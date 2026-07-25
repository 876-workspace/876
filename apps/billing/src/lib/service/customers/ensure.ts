import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
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

  const snapshot = {
    name: params.name,
    email: params.email ?? null,
    companyName: params.companyName ?? null,
    firstName: params.firstName ?? null,
    lastName: params.lastName ?? null,
    phone: params.phone ?? null,
    customerKind: (params.customerKind ??
      (isOrganization ? 'BUSINESS' : 'INDIVIDUAL')) as
      | 'BUSINESS'
      | 'INDIVIDUAL',
  }

  const existing = await prisma.customer.findFirst({
    where: identity,
    select: { id: true },
  })
  if (existing) {
    await prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...snapshot,
        coreSyncedAt: nowUnixSeconds(),
        updatedAt: nowUnixSeconds(),
      },
    })
    await syncPrimaryContact(tenantId, existing.id, params.primaryContact)
    return ok({ id: existing.id })
  }

  const result = await create(tenantId, {
    ...snapshot,
    currency: null,
    customerType: params.customerType,
    organizationId: isOrganization ? (params.organizationId ?? null) : null,
    userId: isOrganization ? null : (params.userId ?? null),
    externalReference: null,
    lateFeeExempt: false,
  })
  if (result.error === null) {
    await syncPrimaryContact(tenantId, result.data.id, params.primaryContact)
    return result
  }

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

/**
 * Seeds or refreshes the organization's primary contact.
 *
 * A hand-added primary contact is demoted, never deleted — a locally-entered
 * person is the workspace's data and must survive a Core sync.
 */
async function syncPrimaryContact(
  tenantId: string,
  customerId: string,
  contact: CustomerEnsureParams['primaryContact']
): Promise<void> {
  if (!contact?.userId) return

  const now = nowUnixSeconds()
  const existing = await prisma.contact.findFirst({
    where: { tenantId, customerId, userId: contact.userId },
    select: { id: true },
  })

  if (existing) {
    await prisma.contact.update({
      where: { id: existing.id },
      data: {
        firstName: contact.firstName ?? null,
        lastName: contact.lastName ?? null,
        email: contact.email ?? null,
        isPrimary: true,
        coreSyncedAt: now,
        updatedAt: now,
      },
    })
    return
  }

  // One primary per customer is enforced by a partial unique index.
  await prisma.contact.updateMany({
    where: { tenantId, customerId, isPrimary: true },
    data: { isPrimary: false, updatedAt: now },
  })

  await prisma.contact.create({
    data: {
      id: generateId('Contact'),
      tenantId,
      customerId,
      userId: contact.userId,
      firstName: contact.firstName ?? null,
      lastName: contact.lastName ?? null,
      email: contact.email ?? null,
      mobilePhone: contact.phone ?? null,
      isPrimary: true,
      coreSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  })
}
