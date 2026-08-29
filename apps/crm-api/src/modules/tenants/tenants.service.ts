import { isError } from '@876/core'

import { reconcileCrmProvisioning } from '../../provisioning/reconcile.js'
import type { CrmProvisioningManifest } from '../../types/provisioning.js'
import * as repository from './tenants.repository.js'

export function retrieveByOrganization(organizationId: string) {
  return repository.retrieveByOrganization(organizationId)
}

export async function ensure(
  organizationId: string,
  provisioning?: CrmProvisioningManifest
) {
  const tenant = await repository.ensure(organizationId)
  if (!provisioning) return tenant

  const provisioningError = await reconcileCrmProvisioning(tenant.id, provisioning)
  if (isError(provisioningError)) return provisioningError

  return repository.markProvisioned(tenant.id, provisioning.revision)
}
