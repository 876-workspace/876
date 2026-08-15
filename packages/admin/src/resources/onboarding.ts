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
  fieldType: AdminOnboardingFieldType
  required: boolean
  sensitive: boolean
  placeholder: string | null
  pattern: string | null
  minItems: number | null
  requiredWhen: { fieldKey: string; equals: AdminJsonValue } | null
  options: AdminOnboardingOption[]
  itemFields: AdminOnboardingField[]
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
  targetType: AdminOnboardingTargetType
  targetKey: string
  countryCode: string
  schemaVersion: 1
  catalogRevision: number
  sections: AdminOnboardingSection[]
}

export type AdminOnboardingSession = {
  object: 'onboarding_session'
  id: string
  organizationId: string
  targetType: AdminOnboardingTargetType
  targetKey: string
  countryCode: string
  schemaVersion: 1
  catalogRevision: number
  status: 'draft' | 'submitted' | 'completed' | 'needs_update'
  answers: Record<string, AdminJsonValue>
  submittedAt: number | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
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
  countryCode: string
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
        query: { countryCode: countryCode },
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
        query: { countryCode: countryCode },
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
        query: { countryCode: countryCode },
      })
    },
  }
}
