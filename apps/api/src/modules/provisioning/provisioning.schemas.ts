import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

export const provisioningTargetTypeSchema = z.enum([
  'organization',
  'finance',
  'application',
])
export const provisioningRevisionStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
])
export const provisioningValueTypeSchema = z.enum([
  'string',
  'integer',
  'decimal',
  'boolean',
  'reference',
])
export const financeDependencySchema = z.enum(['none', 'embedded'])

const FINANCE_SCOPE_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/

export const provisioningPropertyInputSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(120)
      .transform((v) => v.trim())
      .refine((v) => v.length > 0, {
        message: 'Property key cannot be blank.',
      }),
    value_type: provisioningValueTypeSchema,
    string_value: z.string().nullable().optional(),
    integer_value: z.number().int().nullable().optional(),
    decimal_value: z
      .union([z.string(), z.number()])
      .nullable()
      .optional()
      .transform((v) => (v === null || v === undefined ? null : String(v))),
    boolean_value: z.boolean().nullable().optional(),
    reference_namespace: z
      .string()
      .max(120)
      .nullable()
      .optional()
      .transform((v) => (v == null ? null : v.trim())),
    reference_key: z
      .string()
      .max(240)
      .nullable()
      .optional()
      .transform((v) => (v == null ? null : v.trim())),
  })
  .superRefine((data, ctx) => {
    if (data.integer_value !== null && data.integer_value !== undefined) {
      if (data.integer_value < -(2 ** 63) || data.integer_value > 2 ** 63 - 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Integer values must fit in a signed 64-bit integer.',
          path: ['integer_value'],
        })
      }
    }
    if (data.decimal_value !== null && data.decimal_value !== undefined) {
      const dec = String(data.decimal_value)
      const num = Number(dec)
      if (!Number.isFinite(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Decimal values must be finite.',
          path: ['decimal_value'],
        })
      }
      if (Math.abs(num) >= 1e16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Decimal values support at most 16 integer digits.',
          path: ['decimal_value'],
        })
      }
      const exponent = dec.includes('.') ? -dec.split('.')[1]!.length : 0
      if (exponent < -8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Decimal values support at most 8 fractional digits.',
          path: ['decimal_value'],
        })
      }
    }

    const scalarValues: Record<string, unknown> = {
      string: data.string_value,
      integer: data.integer_value,
      decimal: data.decimal_value,
      boolean: data.boolean_value,
    }

    if (data.value_type === 'reference') {
      if (!data.reference_namespace || !data.reference_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Reference values require a namespace and key.',
        })
      }
      if (
        Object.values(scalarValues).some((v) => v !== null && v !== undefined)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Reference values cannot include a scalar value.',
        })
      }
      return
    }

    if (
      scalarValues[data.value_type] === null ||
      scalarValues[data.value_type] === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.value_type} values require their typed value field.`,
      })
    }
    if (
      Object.values(scalarValues).filter((v) => v !== null && v !== undefined)
        .length !== 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exactly one scalar value field is allowed.',
      })
    }
    if (data.reference_namespace || data.reference_key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Scalar values cannot include reference fields.',
      })
    }
  })

export const provisioningResourceInputSchema = z.object({
  resource_type: z
    .string()
    .min(1)
    .max(120)
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, {
      message: 'Resource identifiers cannot be blank.',
    }),
  key: z
    .string()
    .min(1)
    .max(120)
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, {
      message: 'Resource identifiers cannot be blank.',
    }),
  position: z
    .number()
    .int()
    .min(0)
    .max(2 ** 31 - 1),
  properties: z.array(provisioningPropertyInputSchema).max(100).default([]),
})

export const provisioningStepInputSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(120)
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: 'Step fields cannot be blank.' }),
  description: z
    .string()
    .min(1)
    .max(1000)
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: 'Step fields cannot be blank.' }),
  position: z
    .number()
    .int()
    .min(0)
    .max(2 ** 31 - 1),
})

export const provisioningDraftReplaceSchema = z
  .strictObject({
    manifest_version: z.literal(1).default(1),
    reconciliation: z.literal('create_missing').default('create_missing'),
    preserve_tenant_overrides: z.literal(true).default(true),
    finance_dependency: financeDependencySchema.default('none'),
    finance_scopes: z
      .array(z.string())
      .max(50)
      .default([])
      .transform((values) => values.map((v) => v.trim()))
      .refine(
        (values) =>
          values.every(
            (v) =>
              v.length > 0 && v.length <= 120 && FINANCE_SCOPE_PATTERN.test(v)
          ),
        { message: 'Finance scopes must use a lowercase dotted identifier.' }
      )
      .refine((values) => new Set(values).size === values.length, {
        message: 'Finance scopes must be unique.',
      }),
    resources: z.array(provisioningResourceInputSchema).max(500).default([]),
    steps: z.array(provisioningStepInputSchema).max(100).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.finance_dependency === 'none' && data.finance_scopes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Targets without a finance dependency cannot request finance scopes.',
      })
    }
    if (
      data.finance_dependency === 'embedded' &&
      data.finance_scopes.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Embedded finance dependencies require at least one scope.',
      })
    }
    const resourceKeys = data.resources.map(
      (r) => `${r.resource_type}:${r.key}`
    )
    if (new Set(resourceKeys).size !== resourceKeys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Resource type/key pairs must be unique.',
      })
    }
    if (
      new Set(data.resources.map((r) => r.position)).size !==
      data.resources.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Resource positions must be unique.',
      })
    }
    for (const r of data.resources) {
      const keys = r.properties.map((p) => p.key)
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Property keys must be unique within a resource.',
        })
      }
    }
    if (new Set(data.steps.map((s) => s.key)).size !== data.steps.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Step keys must be unique.',
      })
    }
    if (new Set(data.steps.map((s) => s.position)).size !== data.steps.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Step positions must be unique.',
      })
    }
  })

// Response schemas

export const provisioningPropertyResponseSchema = z
  .object({
    object: z.literal('provisioning_property'),
    id: z.string(),
    key: z.string(),
    value_type: provisioningValueTypeSchema,
    string_value: z.string().nullable(),
    integer_value: z.string().nullable(),
    // A decimal is a string end-to-end (`.claude/rules/module-settings.md`);
    // the serializer has already stringified it, so this only describes it.
    decimal_value: z.string().nullable(),
    boolean_value: z.boolean().nullable(),
    reference_namespace: z.string().nullable(),
    reference_key: z.string().nullable(),
  })
  .meta({ id: 'ProvisioningProperty' })

export const provisioningResourceResponseSchema = z
  .object({
    object: z.literal('provisioning_resource'),
    id: z.string(),
    resource_type: z.string(),
    key: z.string(),
    position: z.number().int(),
    properties: z.array(provisioningPropertyResponseSchema),
  })
  .meta({ id: 'ProvisioningResource' })

export const provisioningStepResponseSchema = z
  .object({
    object: z.literal('provisioning_step'),
    id: z.string(),
    key: z.string(),
    description: z.string(),
    position: z.number().int(),
  })
  .meta({ id: 'ProvisioningStep' })

export const provisioningRevisionResponseSchema = z
  .object({
    object: z.literal('provisioning_manifest_revision'),
    id: z.string(),
    manifest_id: z.string(),
    manifest_version: z.literal(1).default(1),
    revision: z.number().int(),
    status: provisioningRevisionStatusSchema,
    reconciliation: z.literal('create_missing'),
    preserve_tenant_overrides: z.boolean(),
    finance_dependency: financeDependencySchema,
    finance_scopes: z.array(z.string()),
    resources: z.array(provisioningResourceResponseSchema),
    steps: z.array(provisioningStepResponseSchema),
    published_at: z.number().int().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'ProvisioningRevision' })

export const provisioningManifestResponseSchema = z
  .object({
    object: z.literal('provisioning_manifest'),
    id: z.string(),
    target_type: provisioningTargetTypeSchema,
    target_key: z.string(),
    manifest_version: z.literal(1).default(1),
    published: provisioningRevisionResponseSchema.nullable(),
    draft: provisioningRevisionResponseSchema.nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'ProvisioningManifest' })

export const provisioningValidationIssueSchema = z.object({
  path: z.string(),
  code: z.string(),
  message: z.string(),
})

export const provisioningValidationResponseSchema = z
  .object({
    object: z.literal('provisioning_validation'),
    valid: z.boolean(),
    issues: z.array(provisioningValidationIssueSchema),
  })
  .meta({ id: 'ProvisioningValidation' })

export const provisioningFieldDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  value_type: provisioningValueTypeSchema,
  required: z.boolean(),
  reference_namespace: z.string().nullable(),
  allowed_values: z.array(z.string()).nullable(),
})

export const provisioningResourceDefinitionSchema = z.object({
  resource_type: z.string(),
  label: z.string(),
  description: z.string(),
  multiple: z.boolean(),
  minimum_items: z.number().int(),
  maximum_items: z.number().int().nullable(),
  fields: z.array(provisioningFieldDefinitionSchema),
})

export const provisioningCatalogResponseSchema = z
  .object({
    object: z.literal('provisioning_catalog'),
    manifest_version: z.literal(1).default(1),
    target_type: provisioningTargetTypeSchema,
    resource_types: z.array(provisioningResourceDefinitionSchema),
  })
  .meta({ id: 'ProvisioningCatalog' })

export const provisioningNoteCreateSchema = z.strictObject({
  body: z
    .string()
    .min(1)
    .max(10000)
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: 'Note body cannot be blank.' }),
  author_user_id: z.string().max(255).nullable().optional(),
})

export const provisioningNoteResponseSchema = z
  .object({
    object: z.literal('provisioning_note'),
    id: z.string(),
    manifest_id: z.string(),
    body: z.string(),
    author_user_id: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'ProvisioningNote' })

export const provisioningNoteDeleteResponseSchema = z.object({
  object: z.literal('provisioning_note'),
  id: z.string(),
  deleted: z.literal(true),
})

export const provisioningRunStatusSchema = z.enum([
  'queued',
  'processing',
  'succeeded',
  'failed',
])
export const provisioningRunTriggerSchema = z.enum([
  'app_activation',
  'manifest_publish',
  'manual_reconcile',
  'retry',
])
export const provisioningTargetTypeParamSchema = provisioningTargetTypeSchema

export const provisioningRunStepResponseSchema = z
  .object({
    object: z.literal('provisioning_run_step'),
    id: z.string(),
    target_type: provisioningTargetTypeSchema,
    target_key: z.string(),
    revision_id: z.string(),
    revision: z.number().int(),
    step_key: z.string(),
    description: z.string(),
    position: z.number().int(),
    status: provisioningRunStatusSchema,
    attempt_count: z.number().int(),
    started_at: z.number().int().nullable(),
    completed_at: z.number().int().nullable(),
    last_error: z.string().nullable(),
  })
  .meta({ id: 'ProvisioningRunStep' })

export const provisioningRunResponseSchema = z
  .object({
    object: z.literal('provisioning_run'),
    id: z.string(),
    organization_id: z.string(),
    app_id: z.string(),
    subscription_id: z.string().nullable(),
    outbox_event_id: z.string().nullable(),
    trigger: provisioningRunTriggerSchema,
    status: provisioningRunStatusSchema,
    manifest_version: z.literal(1).default(1),
    finance_revision_id: z.string().nullable(),
    finance_revision: z.number().int().nullable(),
    application_revision_id: z.string().nullable(),
    application_revision: z.number().int().nullable(),
    attempt_count: z.number().int(),
    available_at: z.number().int(),
    started_at: z.number().int().nullable(),
    completed_at: z.number().int().nullable(),
    last_error: z.string().nullable(),
    steps: z.array(provisioningRunStepResponseSchema),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'ProvisioningRun' })

export const provisioningReconcileRequestSchema = z.strictObject({
  app_id: z.string().max(255).nullable().optional(),
  organization_id: z.string().max(255).nullable().optional(),
  limit: z.number().int().min(1).max(5000).default(1000),
  starting_after: z.string().max(255).nullable().optional(),
})

export const provisioningReconcileResponseSchema = z
  .object({
    object: z.literal('provisioning_reconciliation'),
    examined: z.number().int(),
    enqueued: z.number().int(),
    next_cursor: z.string().nullable(),
  })
  .meta({ id: 'ProvisioningReconciliation' })

export const provisioningApplicationClaimRequestSchema = z.strictObject({
  organization_id: z.string().min(1).max(255),
  app_id: z.string().min(1).max(255),
})

export const provisioningApplicationCompleteRequestSchema = z
  .strictObject({
    status: z.enum(['succeeded', 'failed']),
    error: z.string().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'failed' && !data.error?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Failed application runs require an error message.',
      })
    }
    if (data.status === 'succeeded' && data.error != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Successful application runs cannot include an error message.',
      })
    }
  })

export const provisioningCatalogParamsSchema = z.strictObject({
  target_type: provisioningTargetTypeSchema,
  target_key: z.string(),
})

export const provisioningManifestParamsSchema = z.strictObject({
  target_type: provisioningTargetTypeSchema,
  target_key: z.string(),
})

export const provisioningNoteParamsSchema = z.strictObject({
  target_type: provisioningTargetTypeSchema,
  target_key: z.string(),
  note_id: z.string(),
})

export const provisioningRunIdParamsSchema = z.strictObject({
  run_id: z.string(),
})

export const listRunsQuerySchema = z.object({
  organization_id: z.string().optional(),
  app_id: z.string().optional(),
  status: provisioningRunStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})

export const listNotesQuerySchema = paginationQuerySchema

export type ProvisioningDraftReplace = z.infer<
  typeof provisioningDraftReplaceSchema
>
export type ProvisioningRunStatus = z.infer<typeof provisioningRunStatusSchema>
