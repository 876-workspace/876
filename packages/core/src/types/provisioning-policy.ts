/**
 * Provisioning setup selection/access policy.
 *
 * This is deliberately separate from the manifest-v1 protocol. A setup policy
 * answers two questions before a manifest is applied:
 *
 * 1. Which organizations may match this setup?
 * 2. Which application/service entitlements should this setup grant?
 *
 * Match groups are OR'd together. Conditions inside the same group are AND'd.
 * This lets a setup match multiple countries today while leaving room for
 * country + subdivision/jurisdiction matching later without a schema redesign.
 */

export const PROVISIONING_SETUP_CONDITION_FIELDS = [
  'country',
  'subdivision',
  'jurisdiction',
] as const

export type ProvisioningSetupConditionField =
  (typeof PROVISIONING_SETUP_CONDITION_FIELDS)[number]

export type ProvisioningSetupConditionOperator = 'equals'

export type ProvisioningSetupCondition = {
  object: 'provisioning_setup_condition'
  id: string
  group_key: string
  field: ProvisioningSetupConditionField
  operator: ProvisioningSetupConditionOperator
  value: string
  priority: number
  created_at: number
  updated_at: number
}

export type ProvisioningSetupEntitlementTargetType = 'application' | 'service'

export type ProvisioningSetupEntitlement = {
  object: 'provisioning_setup_entitlement'
  id: string
  target_type: ProvisioningSetupEntitlementTargetType
  target_key: string
  enabled: boolean
  created_at: number
  updated_at: number
}

export type ProvisioningSetupPolicy = {
  object: 'provisioning_setup_policy'
  setup_id: string
  setup_key: string
  conditions: ProvisioningSetupCondition[]
  entitlements: ProvisioningSetupEntitlement[]
  updated_at: number
}

export type ProvisioningSetupPolicyReplaceParams = {
  conditions: Array<{
    group_key: string
    field: ProvisioningSetupConditionField
    operator?: ProvisioningSetupConditionOperator
    value: string
    priority?: number
  }>
  entitlements: Array<{
    target_type: ProvisioningSetupEntitlementTargetType
    target_key: string
    enabled: boolean
  }>
}

/**
 * Organization-addressable first-party application entitlements.
 *
 * `console` is internal and `876-consumer` is not an organization entitlement,
 * so neither belongs in setup access policy. Embedded finance is also not an
 * application entitlement; Billing/Invoice remain explicit product access.
 */
export const PROVISIONING_APPLICATION_ENTITLEMENTS = [
  {
    target_type: 'application',
    target_key: '876-enterprise',
    label: '876 Enterprise',
    default_enabled: true,
  },
  {
    target_type: 'application',
    target_key: '876-couriers',
    label: '876 Couriers',
    default_enabled: false,
  },
  {
    target_type: 'application',
    target_key: '876-billing',
    label: '876 Billing',
    default_enabled: false,
  },
  {
    target_type: 'application',
    target_key: '876-invoice',
    label: '876 Invoice',
    default_enabled: false,
  },
  {
    target_type: 'application',
    target_key: '876-crm',
    label: '876 CRM',
    default_enabled: false,
  },
] as const

/**
 * Shared service policy targets. Work is infrastructure, not an App row, so it
 * is intentionally represented as a service entitlement instead of pretending
 * it is an application subscription.
 */
export const PROVISIONING_SERVICE_ENTITLEMENTS = [
  {
    target_type: 'service',
    target_key: 'work',
    label: 'Work service',
    default_enabled: true,
  },
] as const

export const PROVISIONING_SETUP_ENTITLEMENT_CATALOG = [
  ...PROVISIONING_APPLICATION_ENTITLEMENTS,
  ...PROVISIONING_SERVICE_ENTITLEMENTS,
] as const
