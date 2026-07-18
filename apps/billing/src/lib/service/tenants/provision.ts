import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import {
  loadBillingApplicationProvisioningManifest,
  loadBillingProvisioningManifest,
} from '@/lib/provisioning/manifest'
import type { TenantCreateParams } from '@/types/tenant'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'
import {
  ensureBillingMember,
  ensureWorkspace,
  ProvisioningInputError,
} from './workspace'

interface ProvisionedTenant {
  id: string
  created: boolean
  provisioningVersion: number
}

/**
 * Activates paid Billing access on the organization's existing finance
 * workspace, or creates that workspace when no embedded app needed it first.
 */
export async function provision(
  organizationId: string,
  actorUserId: string,
  actorOrgRole: 'owner' | 'admin',
  organizationCountryCode: string | null,
  params: TenantCreateParams
): ServiceResult<ProvisionedTenant> {
  try {
    return ok(
      await runProvisioning(
        organizationId,
        actorUserId,
        actorOrgRole,
        organizationCountryCode,
        params
      )
    )
  } catch (error) {
    if (error instanceof ProvisioningInputError) return err(error.message, 422)

    if (isUniqueConstraintError(error)) {
      try {
        return ok(
          await runProvisioning(
            organizationId,
            actorUserId,
            actorOrgRole,
            organizationCountryCode,
            params
          )
        )
      } catch (retryError) {
        if (retryError instanceof ProvisioningInputError)
          return err(retryError.message, 422)
        if (isUniqueConstraintError(retryError))
          return err('This organization already has a Billing workspace.', 409)
        console.error('[billing.service.tenants.provision]', retryError)
        return err('Failed to provision the Billing workspace.', 500)
      }
    }

    console.error('[billing.service.tenants.provision]', error)
    return err('Failed to provision the Billing workspace.', 500)
  }
}

async function runProvisioning(
  organizationId: string,
  actorUserId: string,
  actorOrgRole: 'owner' | 'admin',
  organizationCountryCode: string | null,
  params: TenantCreateParams
): Promise<ProvisionedTenant> {
  const now = nowUnixSeconds()
  const [manifest, applicationManifest] = await Promise.all([
    loadBillingProvisioningManifest(),
    loadBillingApplicationProvisioningManifest(),
  ])
  return prisma.$transaction(async (tx) => {
    const workspace = await ensureWorkspace(
      tx,
      manifest,
      {
        organizationId,
        organizationCountryCode,
        name: params.name,
        slug: params.slug,
      },
      now,
      applicationManifest
    )
    await ensureBillingMember(
      tx,
      workspace.id,
      actorUserId,
      actorOrgRole === 'owner' ? workspace.ownerRoleId : workspace.adminRoleId,
      now
    )
    return {
      id: workspace.id,
      created: workspace.created,
      provisioningVersion: workspace.provisioningVersion,
    }
  })
}
