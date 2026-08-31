import {
  PROVISIONING_SETUP_CONDITION_FIELDS,
  type ProvisioningSetupConditionField,
} from '@876/core/types/provisioning-policy'
import { z } from 'zod'

export const provisioningSetupPolicyParamsSchema = z.strictObject({
  setup_key: z.string().min(1).max(60),
})

const conditionFieldSchema = z.enum(PROVISIONING_SETUP_CONDITION_FIELDS)
const conditionOperatorSchema = z.literal('equals')
const entitlementTargetTypeSchema = z.enum(['application', 'service'])

function normalizeConditionValue(
  field: ProvisioningSetupConditionField,
  value: string
): string {
  const trimmed = value.trim()
  if (field === 'country') return trimmed.toUpperCase()
  if (field === 'subdivision') return trimmed.toUpperCase()
  return trimmed
}

export const provisioningSetupConditionInputSchema = z
  .strictObject({
    group_key: z
      .string()
      .min(1)
      .max(80)
      .transform((value) => value.trim().toLowerCase())
      .refine((value) => /^[a-z0-9][a-z0-9-]*$/.test(value), {
        message: 'Condition group keys use lowercase letters, digits, and hyphens.',
      }),
    field: conditionFieldSchema,
    operator: conditionOperatorSchema.optional().default('equals'),
    value: z.string().min(1).max(160),
    priority: z.number().int().min(-10000).max(10000).optional().default(0),
  })
  .transform((condition) => ({
    ...condition,
    value: normalizeConditionValue(condition.field, condition.value),
  }))
  .superRefine((condition, ctx) => {
    if (condition.field === 'country' && !/^[A-Z]{2}$/.test(condition.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Country conditions require a two-letter country code.',
      })
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

export const provisioningSetupEntitlementInputSchema = z.strictObject({
  target_type: entitlementTargetTypeSchema,
  target_key: z
    .string()
    .min(1)
    .max(120)
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => /^[a-z0-9][a-z0-9-]*$/.test(value), {
      message: 'Entitlement target keys use lowercase letters, digits, and hyphens.',
    }),
  enabled: z.boolean(),
})

export const provisioningSetupPolicyReplaceSchema = z
  .strictObject({
    conditions: z.array(provisioningSetupConditionInputSchema).max(250),
    entitlements: z.array(provisioningSetupEntitlementInputSchema).max(100),
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
        message: 'Provisioning setup conditions must be unique.',
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
          message: 'Every condition in one match group must use the same priority.',
        })
      }
    })

    const entitlementKeys = data.entitlements.map(
      (entitlement) => `${entitlement.target_type}:${entitlement.target_key}`
    )
    if (new Set(entitlementKeys).size !== entitlementKeys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entitlements'],
        message: 'Provisioning setup entitlement targets must be unique.',
      })
    }
  })

export const provisioningSetupConditionResponseSchema = z.object({
  object: z.literal('provisioning_setup_condition'),
  id: z.string(),
  group_key: z.string(),
  field: conditionFieldSchema,
  operator: conditionOperatorSchema,
  value: z.string(),
  priority: z.number().int(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const provisioningSetupEntitlementResponseSchema = z.object({
  object: z.literal('provisioning_setup_entitlement'),
  id: z.string(),
  target_type: entitlementTargetTypeSchema,
  target_key: z.string(),
  enabled: z.boolean(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const provisioningSetupPolicyResponseSchema = z
  .object({
    object: z.literal('provisioning_setup_policy'),
    setup_id: z.string(),
    setup_key: z.string(),
    conditions: z.array(provisioningSetupConditionResponseSchema),
    entitlements: z.array(provisioningSetupEntitlementResponseSchema),
    updated_at: z.number().int(),
  })
  .meta({ id: 'ProvisioningSetupPolicy' })

export type ProvisioningSetupPolicyReplace = z.infer<
  typeof provisioningSetupPolicyReplaceSchema
>
