/**
 * Onboarding contracts — the field catalog, a saved session, and validation.
 *
 * Ported from `domains/onboarding/schemas.py`. An answer value is arbitrary
 * JSON, because a field may be text, a number, a boolean, a list of selections,
 * or a list of objects — the catalog says which, and validation enforces it.
 */

import { z } from 'zod'

export const ONBOARDING_TARGET_TYPES = ['organization', 'application'] as const
export const onboardingTargetTypeSchema = z.enum(ONBOARDING_TARGET_TYPES)
export type OnboardingTargetType = z.infer<typeof onboardingTargetTypeSchema>

export const ONBOARDING_FIELD_TYPES = [
  'string',
  'text',
  'email',
  'phone',
  'url',
  'date',
  'integer',
  'boolean',
  'select',
  'multiselect',
  'collection',
] as const
export const onboardingFieldTypeSchema = z.enum(ONBOARDING_FIELD_TYPES)
export type OnboardingFieldType = z.infer<typeof onboardingFieldTypeSchema>

export const ONBOARDING_STATUSES = [
  'draft',
  'submitted',
  'completed',
  'needs_update',
] as const
export const onboardingStatusSchema = z.enum(ONBOARDING_STATUSES)
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>

/** Any JSON value — an answer's shape is decided by its field's type. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
)

export const onboardingOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
})

export type OnboardingOption = z.infer<typeof onboardingOptionSchema>

/** "This field is required when that field equals this value." */
export const onboardingConditionSchema = z.object({
  field_key: z.string(),
  equals: jsonValueSchema,
})

export type OnboardingCondition = z.infer<typeof onboardingConditionSchema>

export type OnboardingFieldDefinition = {
  key: string
  label: string
  description: string | null
  field_type: OnboardingFieldType
  required: boolean
  sensitive: boolean
  placeholder: string | null
  pattern: string | null
  min_items: number | null
  required_when: OnboardingCondition | null
  options: OnboardingOption[]
  item_fields: OnboardingFieldDefinition[]
}

export const onboardingFieldDefinitionSchema: z.ZodType<OnboardingFieldDefinition> =
  z.lazy(() =>
    z.object({
      key: z.string(),
      label: z.string(),
      description: z.string().nullable(),
      field_type: onboardingFieldTypeSchema,
      required: z.boolean(),
      sensitive: z.boolean(),
      placeholder: z.string().nullable(),
      pattern: z.string().nullable(),
      min_items: z.number().int().nullable(),
      required_when: onboardingConditionSchema.nullable(),
      options: z.array(onboardingOptionSchema),
      item_fields: z.array(onboardingFieldDefinitionSchema),
    })
  )

export const onboardingSectionDefinitionSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  position: z.number().int(),
  fields: z.array(onboardingFieldDefinitionSchema),
})

export type OnboardingSectionDefinition = z.infer<
  typeof onboardingSectionDefinitionSchema
>

export const onboardingCatalogSchema = z
  .object({
    object: z.literal('onboarding_catalog'),
    target_type: onboardingTargetTypeSchema,
    target_key: z.string(),
    country_code: z.string(),
    schema_version: z.literal(1),
    catalog_revision: z.number().int(),
    sections: z.array(onboardingSectionDefinitionSchema),
  })
  .meta({
    id: 'OnboardingCatalog',
    description: 'The fields an organization must answer for one target.',
  })

export type OnboardingCatalog = z.infer<typeof onboardingCatalogSchema>

export const onboardingValidationIssueSchema = z.object({
  path: z.string(),
  code: z.string(),
  message: z.string(),
})

export type OnboardingValidationIssue = z.infer<
  typeof onboardingValidationIssueSchema
>

export const onboardingValidationSchema = z
  .object({
    object: z.literal('onboarding_validation'),
    valid: z.boolean(),
    issues: z.array(onboardingValidationIssueSchema),
  })
  .meta({
    id: 'OnboardingValidation',
    description: 'The result of checking answers against a catalog.',
  })

export type OnboardingValidation = z.infer<typeof onboardingValidationSchema>

export const onboardingSessionSchema = z
  .object({
    object: z.literal('onboarding_session'),
    id: z.string(),
    organization_id: z.string(),
    target_type: onboardingTargetTypeSchema,
    target_key: z.string(),
    country_code: z.string(),
    schema_version: z.literal(1),
    catalog_revision: z.number().int(),
    status: onboardingStatusSchema,
    answers: z.record(z.string(), jsonValueSchema),
    submitted_at: z.number().int().nullable(),
    completed_at: z.number().int().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({
    id: 'OnboardingSession',
    description: "One organization's answers for one onboarding target.",
  })

export type OnboardingSession = z.infer<typeof onboardingSessionSchema>

export const onboardingAnswersReplaceSchema = z.strictObject({
  country_code: z.string().length(2),
  answers: z.record(z.string(), jsonValueSchema).default({}),
})

export type OnboardingAnswersReplace = z.infer<
  typeof onboardingAnswersReplaceSchema
>

export const catalogParamsSchema = z.strictObject({
  target_type: onboardingTargetTypeSchema,
  target_key: z.string(),
})

export const sessionParamsSchema = z.strictObject({
  organization_id: z.string(),
  target_type: onboardingTargetTypeSchema,
  target_key: z.string(),
})

export const countryQuerySchema = z.object({
  country_code: z.string().length(2).default('JM'),
})

export type CountryQuery = z.infer<typeof countryQuerySchema>
