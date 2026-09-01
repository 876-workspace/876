export const APPLICATION_PROVISIONING_PROFILE_CONDITION_FIELDS = [
  'setup',
  'country',
  'subdivision',
  'jurisdiction',
  'plan',
] as const

export type ApplicationProvisioningProfileConditionField =
  (typeof APPLICATION_PROVISIONING_PROFILE_CONDITION_FIELDS)[number]

export type ApplicationProvisioningProfileStatus =
  | 'draft'
  | 'active'
  | 'archived'
export type ApplicationProvisioningProfileStoredSelectionType =
  | 'policy'
  | 'default'
  | 'backfill'
export type ApplicationProvisioningProfileSelectionMatchType =
  | ApplicationProvisioningProfileStoredSelectionType
  | 'persisted'

export type ApplicationProvisioningProfileCondition = {
  object: 'application_provisioning_profile_condition'
  id: string
  group_key: string
  field: ApplicationProvisioningProfileConditionField
  operator: 'equals'
  value: string
  priority: number
  created_at: number
  updated_at: number
}

export type ApplicationProvisioningProfile = {
  object: 'application_provisioning_profile'
  id: string
  app_id: string
  app_slug: string
  key: string
  name: string
  description: string | null
  status: ApplicationProvisioningProfileStatus
  is_default: boolean
  manifest_target: string
  published_revision: number | null
  has_draft: boolean
  selection_count: number
  conditions: ApplicationProvisioningProfileCondition[]
  created_at: number
  updated_at: number
}

export type ApplicationProvisioningProfileCreateParams = {
  key: string
  name: string
  description?: string | null
  is_default?: boolean
  /** Optional profile whose published manifest seeds the new profile draft. */
  copy_from?: string | null
}

export type ApplicationProvisioningProfileUpdateParams = {
  name?: string
  description?: string | null
  status?: ApplicationProvisioningProfileStatus
  is_default?: boolean
}

export type ApplicationProvisioningProfileConditionInput = {
  group_key: string
  field: ApplicationProvisioningProfileConditionField
  operator?: 'equals'
  value: string
  priority?: number
}

export type ApplicationProvisioningProfilePolicyReplaceParams = {
  conditions: ApplicationProvisioningProfileConditionInput[]
}

/**
 * Inputs available when selecting one app provisioning profile.
 *
 * `setup` is the persisted organization provisioning setup and is the preferred
 * jurisdictional discriminator. Country/subdivision/jurisdiction are carried
 * for cases where an app genuinely needs finer routing. `plan` is the active
 * subscription product/plan slug when one can be resolved.
 */
export type ApplicationProvisioningProfileSelectionContext = {
  setup: string | null
  country: string | null
  subdivision: string | null
  jurisdiction: string | null
  plan: string | null
}

export type ApplicationProvisioningProfileSelectionCandidate = {
  id: string
  app_id: string
  app_slug: string
  key: string
  is_default: boolean
  conditions: ApplicationProvisioningProfileCondition[]
}

export type ApplicationProvisioningProfileSelection = {
  app_id: string
  app_slug: string
  profile_id: string
  profile_key: string
  match_type: ApplicationProvisioningProfileSelectionMatchType
  match_group_key: string | null
  match_priority: number | null
  matched_fields: ApplicationProvisioningProfileConditionField[]
  context: ApplicationProvisioningProfileSelectionContext
}

export type PersistedApplicationProvisioningProfileSelection = {
  organization_id: string
  app_id: string
  app_slug: string
  profile_id: string
  profile_key: string
  selection_type: ApplicationProvisioningProfileStoredSelectionType
  match_group_key: string | null
  match_priority: number | null
  matched_fields: ApplicationProvisioningProfileConditionField[]
  selected_at: number
}
