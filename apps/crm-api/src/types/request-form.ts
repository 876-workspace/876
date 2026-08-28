import { z } from 'zod'

export const requestFormStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
])

export const requestFormPrioritySchema = z.enum([
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
])

export const requestFormFieldMappingSchema = z.enum([
  'REQUEST_SUBJECT',
  'REQUEST_DESCRIPTION',
])

const baseFieldSchema = z.object({
  id: z.string().trim().min(1).max(80),
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(160),
  required: z.boolean().default(false),
  hint: z.string().trim().max(300).nullable().optional(),
  mapping: requestFormFieldMappingSchema.nullable().optional(),
})

// Each member carries a single literal `type`. A member whose `type` is itself a
// union does not narrow under `field.type === 'TEXT'`, which silently leaves
// every text shape in the residual type of the select branches below.
const placeholder = z.string().trim().max(240).nullable().optional()

const textFieldSchema = baseFieldSchema.extend({
  type: z.literal('TEXT'),
  placeholder,
})

const longTextFieldSchema = baseFieldSchema.extend({
  type: z.literal('LONG_TEXT'),
  placeholder,
})

const emailFieldSchema = baseFieldSchema.extend({
  type: z.literal('EMAIL'),
  placeholder,
})

const phoneFieldSchema = baseFieldSchema.extend({
  type: z.literal('PHONE'),
  placeholder,
})

const dateFieldSchema = baseFieldSchema.extend({
  type: z.literal('DATE'),
  placeholder,
})

const numberFieldSchema = baseFieldSchema.extend({
  type: z.literal('NUMBER'),
  placeholder,
})

const optionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  value: z.string().trim().min(1).max(160),
})

const selectFieldSchema = baseFieldSchema.extend({
  type: z.literal('SELECT'),
  options: z.array(optionSchema).min(1).max(100),
})

const multiSelectFieldSchema = baseFieldSchema.extend({
  type: z.literal('MULTI_SELECT'),
  options: z.array(optionSchema).min(1).max(100),
})

const checkboxFieldSchema = baseFieldSchema.extend({
  type: z.literal('CHECKBOX'),
})

const instructionsFieldSchema = z.object({
  id: z.string().trim().min(1).max(80),
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/),
  type: z.literal('INSTRUCTIONS'),
  label: z.string().trim().min(1).max(160),
  text: z.string().trim().min(1).max(2_000),
  required: z.literal(false).default(false),
})

export const requestFormFieldSchema = z.discriminatedUnion('type', [
  textFieldSchema,
  longTextFieldSchema,
  emailFieldSchema,
  phoneFieldSchema,
  dateFieldSchema,
  numberFieldSchema,
  selectFieldSchema,
  multiSelectFieldSchema,
  checkboxFieldSchema,
  instructionsFieldSchema,
])

export const requestFormDefinitionSchema = z
  .object({
    fields: z.array(requestFormFieldSchema).min(1).max(50),
  })
  .superRefine((definition, ctx) => {
    const ids = new Set<string>()
    const keys = new Set<string>()
    const mappings = new Map<string, number>()

    for (const [index, field] of definition.fields.entries()) {
      if (ids.has(field.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields', index, 'id'],
          message: 'Field ids must be unique.',
        })
      }
      ids.add(field.id)

      if (keys.has(field.key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields', index, 'key'],
          message: 'Field keys must be unique.',
        })
      }
      keys.add(field.key)

      if ('mapping' in field && field.mapping) {
        mappings.set(field.mapping, (mappings.get(field.mapping) ?? 0) + 1)
      }

      if ('options' in field) {
        const values = new Set<string>()
        for (const option of field.options) {
          if (values.has(option.value)) {
            ctx.addIssue({
              code: 'custom',
              path: ['fields', index, 'options'],
              message: 'Option values must be unique within a field.',
            })
            break
          }
          values.add(option.value)
        }
      }
    }

    if (mappings.get('REQUEST_SUBJECT') !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['fields'],
        message: 'A form must map exactly one field to the request subject.',
      })
    }

    if ((mappings.get('REQUEST_DESCRIPTION') ?? 0) > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['fields'],
        message: 'A form may map at most one field to the request description.',
      })
    }
  })

export const requestFormAnswersSchema = z.record(z.string(), z.unknown())

export const createRequestFormInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1_000).nullable().optional(),
  definition: requestFormDefinitionSchema,
  defaultCategoryId: z.string().trim().max(160).nullable().optional(),
  defaultSubcategoryId: z.string().trim().max(160).nullable().optional(),
  defaultTeamId: z.string().trim().max(160).nullable().optional(),
  defaultPriority: requestFormPrioritySchema.nullable().optional(),
  confirmationTitle: z.string().trim().max(160).nullable().optional(),
  confirmationMessage: z.string().trim().max(1_000).nullable().optional(),
  createdBy: z.string().trim().min(1).max(160),
})

// PATCH semantics: every editable field is optional, so publishing a form does
// not require the caller to resend the whole definition it is publishing.
export const updateRequestFormInputSchema = createRequestFormInputSchema
  .omit({ createdBy: true })
  .partial()
  .extend({
    status: requestFormStatusSchema.optional(),
    updatedBy: z.string().trim().min(1).max(160),
  })

export const submitRequestFormInputSchema = z
  .object({
    answers: requestFormAnswersSchema,
    customerOrganizationId: z.string().trim().min(1).max(160).optional(),
    customerUserId: z.string().trim().min(1).max(160).optional(),
    requesterUserId: z.string().trim().max(160).nullable().optional(),
    requesterContactId: z.string().trim().max(160).nullable().optional(),
    createdBy: z.string().trim().min(1).max(160),
  })
  .refine(
    (value) =>
      Boolean(value.customerOrganizationId) !== Boolean(value.customerUserId),
    {
      message:
        'Provide exactly one customerOrganizationId or customerUserId for an intake submission.',
    }
  )

export type RequestFormStatus = z.infer<typeof requestFormStatusSchema>
export type RequestFormPriority = z.infer<typeof requestFormPrioritySchema>
export type RequestFormFieldMapping = z.infer<
  typeof requestFormFieldMappingSchema
>
export type RequestFormField = z.infer<typeof requestFormFieldSchema>
export type RequestFormDefinition = z.infer<typeof requestFormDefinitionSchema>
export type RequestFormAnswers = z.infer<typeof requestFormAnswersSchema>
export type CreateRequestFormInput = z.infer<
  typeof createRequestFormInputSchema
>
export type UpdateRequestFormInput = z.infer<
  typeof updateRequestFormInputSchema
>
export type SubmitRequestFormInput = z.infer<
  typeof submitRequestFormInputSchema
>
