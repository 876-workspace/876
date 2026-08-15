import { prisma } from '@/db/client'
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

    let tenant = await tx.tenant.findUnique({
      where: { organizationId: event.organization.id },
    })
    if (!tenant) {
      tenant = await tx.tenant.create({
        data: {
          id: generateId('Tenant'),
          organizationId: event.organization.id,
          name: event.organization.name,
          slug: event.organization.slug,
          countryCode: event.organization.countryCode ?? 'JM',
          defaultCurrency: event.organization.currencyCode,
          defaultLanguage: 'en',
          provisioningVersion: event.provisioningRevision,
          provisionedAt: now,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        },
      })
      await tx.tenantCurrency.create({
        data: {
          tenantId: tenant.id,
          currencyCode: event.organization.currencyCode,
          isDefault: true,
          isEnabled: true,
          createdAt: now,
          updatedAt: now,
        },
      })
    }

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

export async function appStatsRows(sourceAppId: string | null) {
  const filter = sourceAppId === null ? {} : { sourceAppId }
  const [connections, customers, invoices, subscriptions] = await Promise.all([
    prisma.appFinanceConnection.count({ where: filter }),
    prisma.customer.count({ where: filter }),
    prisma.invoice.count({ where: filter }),
    prisma.subscription.count({ where: filter }),
  ])
  return { connections, customers, invoices, subscriptions }
}
