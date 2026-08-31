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

export type ProvisioningStoredSelectionType = 'policy' | 'fallback' | 'backfill'
export type ProvisioningSelectionMatchType =
  | ProvisioningStoredSelectionType
  | 'persisted'

/**
 * Explanation of why an organization uses a provisioning setup.
 *
 * `persisted` is a retry/runtime observation, never the stored origin. The
 * organization retains its original `policy`, `fallback`, or `backfill`
 * selection so later retries cannot erase the initial decision trail.
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

export type PersistedProvisioningSelection = {
  setup_key: string
  selection_type: ProvisioningStoredSelectionType | null
  match_group_key: string | null
  match_priority: number | null
  matched_fields: ProvisioningSetupConditionField[]
  selected_at: number | null
}
