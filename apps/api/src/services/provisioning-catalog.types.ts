// Shared provisioning catalog types live in this leaf to break the cycle
// between provisioning-catalog and app-role-provisioning-catalog.

export type ProvisioningTargetType = 'organization' | 'finance' | 'application'
export type ProvisioningValueType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'reference'
export type FinanceDependency = 'none' | 'embedded'

export type ProvisioningFieldDefinition = {
  key: string
  label: string
  valueType: ProvisioningValueType
  required: boolean
  referenceNamespace: string | null
  allowedValues: string[] | null
}

export type ProvisioningResourceDefinition = {
  resourceType: string
  label: string
  description: string
  multiple: boolean
  minimumItems: number
  maximumItems: number | null
  fields: ProvisioningFieldDefinition[]
}

export type ProvisioningValidationIssue = {
  path: string
  code: string
  message: string
}

export type ProvisioningPropertyInput = {
  key: string
  valueType: ProvisioningValueType
  stringValue: string | null
  integerValue: number | null
  decimalValue: string | null
  booleanValue: boolean | null
  referenceNamespace: string | null
  referenceKey: string | null
}

export type ProvisioningResourceInput = {
  resourceType: string
  key: string
  position: number
  properties: ProvisioningPropertyInput[]
}

export type ProvisioningDraftReplace = {
  manifestVersion?: 1
  reconciliation?: 'create_missing'
  preserveTenantOverrides?: true
  financeDependency: FinanceDependency
  financeScopes?: string[]
  resources: ProvisioningResourceInput[]
  steps?: unknown[]
}
