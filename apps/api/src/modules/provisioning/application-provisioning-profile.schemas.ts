import countries from '@876/core/countries.json'
import {
  APPLICATION_PROVISIONING_PROFILE_CONDITION_FIELDS,
  type ApplicationProvisioningProfileConditionField,
} from '@876/core/types/application-provisioning-profile'
import { z } from 'zod'

const COUNTRY_CODES = new Set(
  countries.map((country) => country.countryCode.toUpperCase())
)

export const applicationProvisioningAppParamsSchema = z.strictObject({
  app_key: z.string().min(1).max(160),
})

export const applicationProvisioningProfileParamsSchema = z.strictObject({
  app_key: z.string().min(1).max(160),
  profile_key: z.string().min(1).max(120),
})

const profileKeySchema = z
  .string()
  .min(1)
  .max(80)
  .transform((value) => value.trim().toLowerCase().replace(/\s+/g, '-'))
  .refine((value) => /^[a-z0-9][a-z0-9-]*$/.test(value), {
    message: 'Profile keys use lowercase letters, digits, and hyphens.',
  })

export const applicationProvisioningProfileCreateSchema = z.strictObject({
  key: profileKeySchema,
  name: z.string().min(1).max(120).transform((value) => value.trim()),
  description: z
    .string()
    .max(1000)
    .transform((value) => value.trim())
    .optional()
    .nullable(),
  is_default: z.boolean().optional().default(false),
  copy_from: z.string().min(1).max(120).optional().nullable(),
})

export const applicationProvisioningProfileUpdateSchema = z
  .strictObject({
    name: z.string().min(1).max(120).transform((value) => value.trim()).optional(),
    description: z
      .string()
      .max(1000)
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    status: z.enum(['draft', 'active', 'archived']).optional(),
    is_default: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field is required.',
  })

const conditionFieldSchema = z.enum(
  APPLICATION_PROVISIONING_PROFILE_CONDITION_FIELDS
)

function normalizeConditionValue(
  field: ApplicationProvisioningProfileConditionField,
  value: string
): string {
  const trimmed = value.trim()
  if (field === 'country' || field === 'subdivision')
    return trimmed.toUpperCase()
  if (field === 'setup' || field === 'plan') return trimmed.toLowerCase()
  return trimmed
}

export const applicationProvisioningProfileConditionInputSchema = z
  .strictObject({
    group_key: z
      .string()
      .min(1)
      .max(80)
      .transform((value) => value.trim().toLowerCase())
      .refine((value) => /^[a-z0-9][a-z0-9-]*$/.test(value), {
        message:
          'Condition group keys use lowercase letters, digits, and hyphens.',
      }),
    field: conditionFieldSchema,
    operator: z.literal('equals').optional().default('equals'),
    value: z.string().min(1).max(160),
    priority: z.number().int().min(-10000).max(10000).optional().default(0),
  })
  .transform((condition) => ({
    ...condition,
    value: normalizeConditionValue(condition.field, condition.value),
  }))
  .superRefine((condition, ctx) => {
    if (condition.field === 'country') {
      if (!/^[A-Z]{2}$/.test(condition.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value'],
          message: 'Country conditions require a two-letter country code.',
        })
      } else if (!COUNTRY_CODES.has(condition.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value'],
          message:
            'Country conditions must use the shared 876 country catalog.',
        })
      }
    }

    if (
      condition.field === 'subdivision' &&
      !/^[A-Z]{2}-[A-Z0-9]{1,8}$/.test(condition.value)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Subdivision conditions use ISO-style codes such as US-CA.',
      })
    }
  })

export const applicationProvisioningProfilePolicyReplaceSchema = z
  .strictObject({
    conditions: z
      .array(applicationProvisioningProfileConditionInputSchema)
      .max(250),
  })
  .superRefine((data, ctx) => {
    const conditionKeys = data.conditions.map(
      (condition) =>
        `${condition.group_key}:${condition.field}:${condition.operator}:${condition.value}`
    )
    if (new Set(conditionKeys).size !== conditionKeys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conditions'],
        message: 'Application provisioning profile conditions must be unique.',
      })
    }

    const groupPriorities = new Map<string, number>()
    data.conditions.forEach((condition, index) => {
      const priority = groupPriorities.get(condition.group_key)
      if (priority === undefined) {
        groupPriorities.set(condition.group_key, condition.priority)
        return
      }
      if (priority !== condition.priority) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['conditions', index, 'priority'],
          message:
            'Every condition in one match group must use the same priority.',
        })
      }
    })
  })

export const applicationProvisioningProfileConditionResponseSchema = z.object({
  object: z.literal('application_provisioning_profile_condition'),
  id: z.string(),
  group_key: z.string(),
  field: conditionFieldSchema,
  operator: z.literal('equals'),
  value: z.string(),
  priority: z.number().int(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const applicationProvisioningProfileResponseSchema = z
  .object({
    object: z.literal('application_provisioning_profile'),
    id: z.string(),
    app_id: z.string(),
    app_slug: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.enum(['draft', 'active', 'archived']),
    is_default: z.boolean(),
    manifest_target: z.string(),
    published_revision: z.number().int().nullable(),
    has_draft: z.boolean(),
    selection_count: z.number().int().min(0),
    conditions: z.array(applicationProvisioningProfileConditionResponseSchema),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'ApplicationProvisioningProfile' })

export const applicationProvisioningProfilePolicyResponseSchema = z
  .object({
    object: z.literal('application_provisioning_profile_policy'),
    app_id: z.string(),
    app_slug: z.string(),
    profile_id: z.string(),
    profile_key: z.string(),
    conditions: z.array(applicationProvisioningProfileConditionResponseSchema),
    updated_at: z.number().int(),
  })
  .meta({ id: 'ApplicationProvisioningProfilePolicy' })

export type ApplicationProvisioningProfileCreate = z.infer<
  typeof applicationProvisioningProfileCreateSchema
>
export type ApplicationProvisioningProfileUpdate = z.infer<
  typeof applicationProvisioningProfileUpdateSchema
>
export type ApplicationProvisioningProfilePolicyReplace = z.infer<
  typeof applicationProvisioningProfilePolicyReplaceSchema
>
