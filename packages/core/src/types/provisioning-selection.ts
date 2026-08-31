import type {
  ProvisioningSetupConditionField,
  ProvisioningSetupPolicy,
} from './provisioning-policy'

/** Authoritative organization facts available when selecting a setup. */
export type ProvisioningSelectionContext = {
  country: string | null
  subdivision: string | null
  jurisdiction: string | null
}

export type ProvisioningSelectionMatchType = 'policy' | 'fallback' | 'persisted'

/**
 * Durable explanation of why an organization uses a provisioning setup.
 *
 * `persisted` is returned on retries after the initial policy/fallback decision
 * has already been stored on the organization. Callers must never re-resolve a
 * persisted organization from newer or transient location signals.
 */
export type ProvisioningSetupSelection = {
  setup_id: string
  setup_key: string
  match_type: ProvisioningSelectionMatchType
  match_group_key: string | null
  match_priority: number | null
  matched_fields: ProvisioningSetupConditionField[]
  context: ProvisioningSelectionContext
}

/** Minimal setup/policy projection consumed by the pure resolver. */
export type ProvisioningSelectionCandidate = {
  id: string
  key: string
  is_default: boolean
  policy: Pick<ProvisioningSetupPolicy, 'conditions' | 'entitlements'>
}

export type PersistedProvisioningSelection = Pick<
  ProvisioningSetupSelection,
  | 'setup_key'
  | 'match_type'
  | 'match_group_key'
  | 'match_priority'
  | 'matched_fields'
> & {
  selected_at: number | null
}
