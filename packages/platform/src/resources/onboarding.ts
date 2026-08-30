import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'

export type AdminJsonValue =
  | string
  | number
  | boolean
  | null
  | AdminJsonValue[]
  | { [key: string]: AdminJsonValue }

export type AdminOnboardingTargetType = 'organization' | 'application'
export type AdminOnboardingFieldType =
  | 'string'
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'date'
  | 'integer'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'collection'

export type AdminOnboardingOption = { value: string; label: string }

export type AdminOnboardingField = {
  key: string
  label: string
  description: string | null
  field_type: AdminOnboardingFieldType
  required: boolean
  sensitive: boolean
  placeholder: string | null
  pattern: string | null
  min_items: number | null
  required_when: { field_key: string; equals: AdminJsonValue } | null
  options: AdminOnboardingOption[]
  item_fields: AdminOnboardingField[]
}

export type AdminOnboardingSection = {
  key: string
  title: string
  description: string
  position: number
  fields: AdminOnboardingField[]
}

export type AdminOnboardingCatalog = {
  object: 'onboarding_catalog'
  target_type: AdminOnboardingTargetType
  target_key: string
  country_code: string
  schema_version: 1
  catalog_revision: number
  sections: AdminOnboardingSection[]
}

export type AdminOnboardingSession = {
  object: 'onboarding_session'
  id: string
  organization_id: string
  target_type: AdminOnboardingTargetType
  target_key: string
  country_code: string
  schema_version: 1
  catalog_revision: number
  status: 'draft' | 'submitted' | 'completed' | 'needs_update'
  answers: Record<string, AdminJsonValue>
  submitted_at: number | null
  completed_at: number | null
  created_at: number
  updated_at: number
}

export type AdminOnboardingValidationIssue = {
  path: string
  code: string
  message: string
}

export type AdminOnboardingValidation = {
  object: 'onboarding_validation'
  valid: boolean
  issues: AdminOnboardingValidationIssue[]
}

export type AdminOnboardingAnswersReplaceParams = {
  country_code: string
  answers: Record<string, AdminJsonValue>
}

const targetPath = (targetType: AdminOnboardingTargetType, targetKey: string) =>
  `${encodeURIComponent(targetType)}/${encodeURIComponent(targetKey)}`

/** `$876.onboarding.*` — standardized organization and app data collection. */
export function createAdminOnboardingResource(runtime: AdminRuntime) {
  return {
    retrieveCatalog(
      targetType: AdminOnboardingTargetType,
      targetKey: string,
      countryCode = 'JM'
    ) {
      return adminRequest<AdminOnboardingCatalog>(runtime, {
        method: 'GET',
        path: `/onboarding/catalog/${targetPath(targetType, targetKey)}`,
        query: { country_code: countryCode },
      })
    },

    retrieve(
      organizationId: string,
      targetType: AdminOnboardingTargetType,
      targetKey: string,
      countryCode = 'JM'
    ) {
      return adminRequest<AdminOnboardingSession>(runtime, {
        method: 'GET',
        path: `/onboarding/organizations/${encodeURIComponent(organizationId)}/${targetPath(targetType, targetKey)}`,
        query: { country_code: countryCode },
      })
    },

    replaceAnswers(
      organizationId: string,
      targetType: AdminOnboardingTargetType,
      targetKey: string,
      body: AdminOnboardingAnswersReplaceParams
    ) {
      return adminRequest<AdminOnboardingSession>(runtime, {
        method: 'PUT',
        path: `/onboarding/organizations/${encodeURIComponent(organizationId)}/${targetPath(targetType, targetKey)}`,
        body,
      })
    },

    validate(
      targetType: AdminOnboardingTargetType,
      targetKey: string,
      body: AdminOnboardingAnswersReplaceParams
    ) {
      return adminRequest<AdminOnboardingValidation>(runtime, {
        method: 'POST',
        path: `/onboarding/catalog/${targetPath(targetType, targetKey)}/validate`,
        body,
      })
    },

    submit(
      organizationId: string,
      targetType: AdminOnboardingTargetType,
      targetKey: string,
      countryCode = 'JM'
    ) {
      return adminRequest<AdminOnboardingSession>(runtime, {
        method: 'POST',
        path: `/onboarding/organizations/${encodeURIComponent(organizationId)}/${targetPath(targetType, targetKey)}/submit`,
        query: { country_code: countryCode },
      })
    },
  }
}
