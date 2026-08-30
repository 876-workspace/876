import type { ProvisionedRequestFormInput } from './request-forms.repository.js'
import * as repository from './request-forms.repository.js'

export function retrieveProvisioned(tenantId: string, provisioningKey: string) {
  return repository.retrieveByProvisioningKey(tenantId, provisioningKey)
}

export function ensureProvisioned(
  tenantId: string,
  input: ProvisionedRequestFormInput
) {
  return repository.ensureProvisioned(tenantId, input)
}
