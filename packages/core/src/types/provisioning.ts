/** Canonical contracts for the permanent provisioning manifest v1 protocol. */

export type ProvisioningTargetType = 'organization' | 'finance' | 'application'
export type ProvisioningReconciliation = 'create_missing'
export type ProvisioningFinanceDependency = 'none' | 'embedded'
export type ProvisioningRevisionStatus = 'draft' | 'published' | 'archived'
export type ProvisioningValueType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'reference'

export type ProvisioningProperty = {
  object: 'provisioning_property'
  id: string
  key: string
  value_type: ProvisioningValueType
  string_value: string | null
  integer_value: string | null
  decimal_value: string | null
  boolean_value: boolean | null
  reference_namespace: string | null
  reference_key: string | null
}

export type ProvisioningResource = {
  object: 'provisioning_resource'
  id: string
  resource_type: string
  key: string
  position: number
  properties: ProvisioningProperty[]
}

export type ProvisioningStep = {
  object: 'provisioning_step'
  id: string
  key: string
  description: string
  position: number
}

export type ProvisioningManifestRevision = {
  object: 'provisioning_manifest_revision'
  id: string
  manifest_id: string
  manifest_version: 1
  revision: number
  status: ProvisioningRevisionStatus
  reconciliation: ProvisioningReconciliation
  preserve_tenant_overrides: boolean
  finance_dependency: ProvisioningFinanceDependency
  finance_scopes: string[]
  resources: ProvisioningResource[]
  steps: ProvisioningStep[]
  published_at: number | null
  created_at: number
  updated_at: number
}

export type ProvisioningManifest = {
  object: 'provisioning_manifest'
  id: string
  target_type: ProvisioningTargetType
  target_key: string
  manifest_version: 1
  published: ProvisioningManifestRevision | null
  draft: ProvisioningManifestRevision | null
  created_at: number
  updated_at: number
}

export type ProvisioningDraftReplaceParams = {
  manifest_version?: 1
  reconciliation?: ProvisioningReconciliation
  preserve_tenant_overrides?: true
  finance_dependency?: ProvisioningFinanceDependency
  finance_scopes?: string[]
  resources?: Array<{
    resource_type: string
    key: string
    position: number
    properties: Array<{
      key: string
      value_type: ProvisioningValueType
      string_value?: string | null
      integer_value?: number | string | null
      decimal_value?: string | null
      boolean_value?: boolean | null
      reference_namespace?: string | null
      reference_key?: string | null
    }>
  }>
  steps?: Array<{ key: string; description: string; position: number }>
}

export type ProvisioningValidationIssue = {
  path: string
  code: string
  message: string
}

export type ProvisioningValidation = {
  object: 'provisioning_validation'
  valid: boolean
  issues: ProvisioningValidationIssue[]
}

export type ProvisioningFieldDefinition = {
  key: string
  label: string
  value_type: ProvisioningValueType
  required: boolean
  reference_namespace: string | null
  allowed_values: string[] | null
}

export type ProvisioningResourceDefinition = {
  resource_type: string
  label: string
  description: string
  multiple: boolean
  minimum_items: number
  maximum_items: number | null
  fields: ProvisioningFieldDefinition[]
}

export type ProvisioningCatalog = {
  object: 'provisioning_catalog'
  manifest_version: 1
  target_type: ProvisioningTargetType
  resource_types: ProvisioningResourceDefinition[]
}

export type ProvisioningNote = {
  object: 'provisioning_note'
  id: string
  manifest_id: string
  body: string
  author_user_id: string | null
  created_at: number
  updated_at: number
}

export type ProvisioningRunStatus =
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed'

export type ProvisioningRunTrigger =
  | 'app_activation'
  | 'manifest_publish'
  | 'manual_reconcile'
  | 'retry'

export type ProvisioningRunStep = {
  object: 'provisioning_run_step'
  id: string
  target_type: ProvisioningTargetType
  target_key: string
  revision_id: string
  revision: number
  step_key: string
  description: string
  position: number
  status: ProvisioningRunStatus
  attempt_count: number
  started_at: number | null
  completed_at: number | null
  last_error: string | null
}

export type ProvisioningRun = {
  object: 'provisioning_run'
  id: string
  organization_id: string
  app_id: string
  subscription_id: string | null
  outbox_event_id: string | null
  trigger: ProvisioningRunTrigger
  status: ProvisioningRunStatus
  manifest_version: 1
  finance_revision_id: string | null
  finance_revision: number | null
  application_revision_id: string | null
  application_revision: number | null
  attempt_count: number
  available_at: number
  started_at: number | null
  completed_at: number | null
  last_error: string | null
  steps: ProvisioningRunStep[]
  created_at: number
  updated_at: number
}

export type ProvisioningReconciliationResult = {
  object: 'provisioning_reconciliation'
  examined: number
  enqueued: number
  next_cursor: string | null
}
