import { createHash } from 'node:crypto'

import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import {
  loadBillingApplicationProvisioningManifest,
  loadBillingProvisioningManifest,
} from '@/lib/provisioning/manifest'
import type {
  FinanceProvisioningEvent,
  FinanceProvisioningResult,
} from '@/types/finance-provisioning'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'
import { ensureWorkspace, ProvisioningInputError } from '../tenants/workspace'

class FinanceProvisioningConflict extends Error {}

export async function ensure(
  event: FinanceProvisioningEvent
): ServiceResult<FinanceProvisioningResult> {
  try {
    const [manifest, applicationManifest] = await Promise.all([
      loadBillingProvisioningManifest(),
      loadBillingApplicationProvisioningManifest(event.sourceAppId),
    ])

    try {
      return ok(await applyEvent(event, manifest, applicationManifest))
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error

      return ok(await applyEvent(event, manifest, applicationManifest))
    }
  } catch (error) {
    if (error instanceof FinanceProvisioningConflict)
      return err(error.message, 409)
    if (error instanceof ProvisioningInputError) return err(error.message, 422)

    console.error('[billing.service.finance-connections.ensure]', error)
    return err('Failed to apply the finance provisioning event.', 500)
  }
}

async function applyEvent(
  event: FinanceProvisioningEvent,
  manifest: Awaited<ReturnType<typeof loadBillingProvisioningManifest>>,
  applicationManifest: Awaited<
    ReturnType<typeof loadBillingApplicationProvisioningManifest>
  >
): Promise<FinanceProvisioningResult> {
  const now = nowUnixSeconds()
  const payloadHash = createHash('sha256')
    .update(JSON.stringify(event))
    .digest('hex')

  return prisma.$transaction(async (tx) => {
    const receipt = await tx.financeProvisioningInbox.findUnique({
      where: { eventId: event.eventId },
    })
    if (receipt) {
      if (receipt.payloadHash !== payloadHash)
        throw new FinanceProvisioningConflict(
          'This event ID was already used with a different payload.'
        )
      const duplicateConnection = await tx.appFinanceConnection.findUnique({
        where: { id: receipt.connectionId },
      })
      if (!duplicateConnection)
        throw new Error(
          `Finance receipt ${event.eventId} references a missing connection.`
        )
      return {
        id: duplicateConnection.id,
        tenantId: duplicateConnection.tenantId,
        status: resultStatus(duplicateConnection.status),
        lifecycleVersion: duplicateConnection.lifecycleVersion,
        applied: receipt.applied,
        duplicate: true,
      }
    }

    const workspace = await ensureWorkspace(
      tx,
      manifest,
      {
        organizationId: event.organization.id,
        organizationCountryCode: event.organization.countryCode,
        name: event.organization.name,
        slug: event.organization.slug,
      },
      now,
      applicationManifest
    )
    const current = await tx.appFinanceConnection.findUnique({
      where: {
        billing_app_finance_connections_tenant_source_app_key: {
          tenantId: workspace.id,
          sourceAppId: event.sourceAppId,
        },
      },
    })

    let connection = current
    let applied = false
    if (!current) {
      connection = await tx.appFinanceConnection.create({
        data: {
          id: generateId('AppFinanceConnection'),
          tenantId: workspace.id,
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
    } else if (event.lifecycleVersion > current.lifecycleVersion) {
      connection = await tx.appFinanceConnection.update({
        where: { id: current.id },
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
      event.lifecycleVersion === current.lifecycleVersion &&
      !sameConnectionSnapshot(current, event)
    ) {
      throw new FinanceProvisioningConflict(
        'This lifecycle version conflicts with the current finance connection.'
      )
    }

    if (!connection) throw new Error('Finance connection was not resolved.')

    await tx.financeProvisioningInbox.create({
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

    return {
      id: connection.id,
      tenantId: connection.tenantId,
      status: resultStatus(connection.status),
      lifecycleVersion: connection.lifecycleVersion,
      applied,
      duplicate: false,
    }
  })
}

function sameConnectionSnapshot(
  current: {
    status: string
    scopes: string[]
    entitlementReference: string | null
    provisioningVersion: number
  },
  event: FinanceProvisioningEvent
): boolean {
  return (
    current.status === event.desiredStatus &&
    current.entitlementReference === event.entitlementReference &&
    current.provisioningVersion === event.provisioningRevision &&
    current.scopes.length === event.scopes.length &&
    current.scopes.every((scope, index) => scope === event.scopes[index])
  )
}

function transitionTimestamps(
  status: FinanceProvisioningEvent['desiredStatus'],
  now: number
): { activatedAt?: number; suspendedAt?: number; revokedAt?: number } {
  if (status === 'ACTIVE') return { activatedAt: now }
  if (status === 'SUSPENDED') return { suspendedAt: now }
  return { revokedAt: now }
}

function resultStatus(status: string): FinanceProvisioningResult['status'] {
  if (status === 'ACTIVE' || status === 'SUSPENDED' || status === 'REVOKED')
    return status
  throw new Error(`Unexpected persisted finance connection status: ${status}`)
}
