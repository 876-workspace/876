import type {
  ProvisioningDraftReplaceParams,
  ProvisioningResource,
} from './provisioning'

export const PROVISIONING_SETUP_RESOURCE_TYPES = [
  'workspace',
  'currency',
  'payment_mode',
  'payment_term',
  'invoice_preference',
  'tax_authority',
  'tax_jurisdiction',
  'tax_code',
  'tax_rate',
] as const

export type ProvisioningSetupResourceType =
  (typeof PROVISIONING_SETUP_RESOURCE_TYPES)[number]

type DraftResource = NonNullable<ProvisioningDraftReplaceParams['resources']>[number]

export type ProvisioningSetupResourcePropertyInput = DraftResource['properties'][number]

export type ProvisioningSetupResourceCreateParams = {
  key: string
  position?: number
  properties?: ProvisioningSetupResourcePropertyInput[]
}

export type ProvisioningSetupResourceUpdateParams = {
  position?: number
  properties?: ProvisioningSetupResourcePropertyInput[]
}

export type ProvisioningSetupResource = ProvisioningResource

export type DeletedProvisioningSetupResource = {
  object: 'provisioning_resource'
  resource_type: string
  key: string
  deleted: true
}

export function isProvisioningSetupResourceType(
  value: string
): value is ProvisioningSetupResourceType {
  return (PROVISIONING_SETUP_RESOURCE_TYPES as readonly string[]).includes(value)
}
