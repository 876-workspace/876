import { getError, isError } from '@876/core'

import { workClient } from '../../providers/work.js'
import { ensureCrmWorkspaceFixtures } from '../../provisioning/fixtures.js'
import { reconcileCrmProvisioning } from '../../provisioning/reconcile.js'
import type {
  CrmProvisioningManifest,
  CrmWorkspaceFixture,
} from '../../types/provisioning.js'
import * as repository from './tenants.repository.js'

export function retrieveByOrganization(organizationId: string) {
  return repository.retrieveByOrganization(organizationId)
}

export async function ensure(
  organizationId: string,
  provisioning?: CrmProvisioningManifest,
  fixtures: readonly CrmWorkspaceFixture[] = []
) {
  const tenant = await repository.ensure(organizationId)
  let current = tenant

  // CRM's current Tasks/Reminders modules are backed by the shared Work service.
  // Ensuring infrastructure is not a product entitlement (ADR-018).
  const work = await workClient().workspace.ensure(organizationId)
  if (work.error) return getError('crm/work-unavailable')

  if (provisioning) {
    const provisioningError = await reconcileCrmProvisioning(
      tenant.id,
      provisioning
    )
    if (isError(provisioningError)) return provisioningError
    current = await repository.markProvisioned(tenant.id, provisioning.revision)
  }

  if (fixtures.length > 0)
    await ensureCrmWorkspaceFixtures(tenant.id, fixtures)

  return current
}
