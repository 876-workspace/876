import { prisma } from '@/db/client'
import { provisionTenantWorkspace } from '@/modules/tenants'
import { generateId } from '@/platform/ids'

import type { FinanceProvisioningEvent } from './finance-connections.schemas'

export class FinanceConnectionLifecycleConflict extends Error {}

export async function findActiveConnectionAuthorization(
  tenantId: string,
  appId: string
) {
  return prisma.appFinanceConnection.findUnique({
    where: {
      billing_app_finance_connections_tenant_source_app_key: {
        tenantId,
        sourceAppId: appId,
      },
    },
    select: { status: true, scopes: true },
  })
}

export function applyFinanceProvisioningEvent(
  event: FinanceProvisioningEvent,
  payloadHash: string,
  now: number
) {
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.financeProvisioningInbox.findUnique({
      where: { eventId: event.eventId },
    })
    if (receipt) {
      const connection = await tx.appFinanceConnection.findUnique({
        where: { id: receipt.connectionId },
      })
      return { receipt, connection, duplicate: true }
    }

    // The same bootstrap 876 Billing's own set-up runs, so an organization that
    // arrives through a finance-dependent app (876 Invoice) gets a complete,
    // administrable workspace rather than a bare tenant row.
    const tenant = await provisionTenantWorkspace(tx, {
      organizationId: event.organization.id,
      name: event.organization.name,
      slug: event.organization.slug,
      countryCode: event.organization.countryCode,
      defaultCurrency: event.organization.currencyCode,
      now,
    })

    const current = await tx.appFinanceConnection.findUnique({
      where: {
        billing_app_finance_connections_tenant_source_app_key: {
          tenantId: tenant.id,
          sourceAppId: event.sourceAppId,
        },
      },
    })
    let connection = current
    let applied = false
    if (!connection) {
      connection = await tx.appFinanceConnection.create({
        data: {
          id: generateId('AppFinanceConnection'),
          tenantId: tenant.id,
          sourceAppId: event.sourceAppId,
          status: event.desiredStatus,
          scopes: event.scopes,
          entitlementReference: event.entitlementReference,
          provisioningVersion: event.provisioningRevision,
          lifecycleVersion: event.lifecycleVersion,
          ...transitionTimestamps(event.desiredStatus, now),
          createdAt: now,
          updatedAt: now,
        },
      })
      applied = true
    } else if (event.lifecycleVersion > connection.lifecycleVersion) {
      connection = await tx.appFinanceConnection.update({
        where: { id: connection.id },
        data: {
          status: event.desiredStatus,
          scopes: event.scopes,
          entitlementReference: event.entitlementReference,
          provisioningVersion: event.provisioningRevision,
          lifecycleVersion: event.lifecycleVersion,
          ...transitionTimestamps(event.desiredStatus, now),
          updatedAt: now,
        },
      })
      applied = true
    } else if (
      event.lifecycleVersion === connection.lifecycleVersion &&
      (connection.status !== event.desiredStatus ||
        connection.entitlementReference !== event.entitlementReference ||
        connection.provisioningVersion !== event.provisioningRevision ||
        JSON.stringify(connection.scopes) !== JSON.stringify(event.scopes))
    ) {
      throw new FinanceConnectionLifecycleConflict()
    }

    const createdReceipt = await tx.financeProvisioningInbox.create({
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        contractVersion: event.contractVersion,
        payloadHash,
        aggregateId: event.aggregateId,
        organizationId: event.organization.id,
        sourceAppId: event.sourceAppId,
        connectionId: connection.id,
        provisioningVersion: event.provisioningRevision,
        lifecycleVersion: event.lifecycleVersion,
        applied,
        processedAt: now,
        createdAt: now,
      },
    })
    return { receipt: createdReceipt, connection, duplicate: false }
  })
}

function transitionTimestamps(status: string, now: number) {
  if (status === 'ACTIVE') return { activatedAt: now }
  if (status === 'SUSPENDED') return { suspendedAt: now }
  return { revokedAt: now }
}

const statsSubscriptionSelect = {
  id: true,
  sourceAppId: true,
  externalReference: true,
  customerId: true,
  status: true,
  startAt: true,
  currentPeriodEnd: true,
  createdAt: true,
  customer: { select: { name: true } },
  items: {
    orderBy: { position: 'asc' as const },
    select: {
      quantity: true,
      unitAmount: true,
      price: {
        select: {
          unitAmount: true,
          priceType: true,
          plan: {
            select: {
              id: true,
              code: true,
              name: true,
              entitlementReferenceId: true,
              intervalUnit: true,
              intervalCount: true,
            },
          },
        },
      },
    },
  },
  invoices: {
    where: { status: { notIn: ['DRAFT' as const, 'VOID' as const] } },
    select: { totalAmount: true, amountDue: true },
  },
}

export function findStatsTenant(tenantId: string) {
  return prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { defaultCurrency: true },
  })
}

export function findStatsTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  })
}

export function findStatsProduct(tenantId: string, sourceAppId: string) {
  return prisma.product.findFirst({
    where: { tenantId, sourceAppId },
    select: { id: true },
  })
}

export function findStatsSubscriptions(tenantId: string, sourceAppId?: string) {
  return prisma.subscription.findMany({
    where: {
      tenantId,
      sourceAppId: sourceAppId === undefined ? { not: null } : sourceAppId,
    },
    select: statsSubscriptionSelect,
    orderBy: { createdAt: 'desc' },
  })
}
