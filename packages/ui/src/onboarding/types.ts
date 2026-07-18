export type OnboardingOption = {
  value: string
  label: string
}

export type OnboardingCondition = {
  field_key: string
  equals: unknown
}

export type OnboardingFieldDefinition = {
  key: string
  label: string
  description?: string | null
  field_type: string
  required: boolean
  sensitive?: boolean
  placeholder?: string | null
  pattern?: string | null
  min_items?: number | null
  required_when?: OnboardingCondition | null
  options: OnboardingOption[]
  item_fields?: OnboardingFieldDefinition[]
}

export type OnboardingSectionDefinition = {
  key: string
  title: string
  description: string
  position: number
  fields: OnboardingFieldDefinition[]
}

export type OnboardingCatalog = {
  object: 'onboarding_catalog'
  target_type: 'organization' | 'application'
  target_key: string
  country_code: string
  catalog_revision: number
  sections: OnboardingSectionDefinition[]
}

export type OnboardingAnswers = Record<string, unknown>

export type OnboardingIssue = {
  path: string
  code: string
  message: string
}

export type WizardStep = {
  key: string
  label: string
}
