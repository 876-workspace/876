import { z } from 'zod'

export const layoutEntitySchema = z.enum(['project', 'phase', 'work-item'])

const kebabKeySchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
const nonEmptyUpdate = (data: Record<string, unknown>) =>
  Object.keys(data).length > 0

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const layoutParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const resolveLayoutQuerySchema = z.strictObject({
  entity: layoutEntitySchema,
  workItemTypeId: z.string().trim().min(1).optional(),
})

export const listLayoutsQuerySchema = z.strictObject({
  entity: layoutEntitySchema.optional(),
  workItemTypeId: z.string().trim().min(1).optional(),
})

export const layoutFieldSchema = z.strictObject({
  fieldKey: z.string().trim().min(1).max(120),
  width: z.union([z.literal(1), z.literal(2)]),
  visible: z.boolean(),
})

export const layoutSectionSchema = z.strictObject({
  key: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(100),
  columns: z.union([z.literal(1), z.literal(2)]),
  fields: z.array(layoutFieldSchema).min(1),
})

export const layoutConditionSchema = z
  .strictObject({
    fieldKey: z.string().trim().min(1).max(120),
    op: z.enum(['equals', 'not-equals', 'in', 'is-empty', 'is-not-empty']),
    value: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.op === 'equals' || data.op === 'not-equals') &&
      data.value === undefined
    )
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Equality conditions require a value.',
      })
    if (data.op === 'in' && !Array.isArray(data.value))
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Membership conditions require an array value.',
      })
    if (
      (data.op === 'is-empty' || data.op === 'is-not-empty') &&
      data.value !== undefined
    )
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Emptiness conditions must not carry a value.',
      })
  })

export const layoutEffectSchema = z.strictObject({
  fieldKey: z.string().trim().min(1).max(120),
  effect: z.enum(['show', 'hide', 'require', 'disable']),
})

export const layoutRuleSchema = z.strictObject({
  key: kebabKeySchema,
  when: z.array(layoutConditionSchema),
  then: z.array(layoutEffectSchema).min(1),
})

export const layoutDefinitionSchema = z
  .strictObject({
    sections: z.array(layoutSectionSchema).min(1),
    rules: z.array(layoutRuleSchema),
  })
  .superRefine((data, ctx) => {
    const sectionKeys = data.sections.map((section) => section.key)
    if (new Set(sectionKeys).size !== sectionKeys.length)
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message: 'Layout section keys must be unique.',
      })
    const fieldKeys = data.sections.flatMap((section) =>
      section.fields.map((field) => field.fieldKey)
    )
    if (new Set(fieldKeys).size !== fieldKeys.length)
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message: 'Layout fields must not repeat a field key.',
      })
    const ruleKeys = data.rules.map((rule) => rule.key)
    if (new Set(ruleKeys).size !== ruleKeys.length)
      ctx.addIssue({
        code: 'custom',
        path: ['rules'],
        message: 'Layout rule keys must be unique.',
      })
  })

export const createLayoutBodySchema = z.strictObject({
  entity: layoutEntitySchema,
  workItemTypeId: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1).max(100),
  sections: z.array(layoutSectionSchema).min(1),
  rules: z.array(layoutRuleSchema).optional(),
  isDefault: z.boolean().optional(),
})

export const updateLayoutBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100).optional(),
    sections: z.array(layoutSectionSchema).min(1).optional(),
    rules: z.array(layoutRuleSchema).optional(),
  })
  .refine(nonEmptyUpdate)

export type LayoutEntity = z.infer<typeof layoutEntitySchema>
export type LayoutField = z.infer<typeof layoutFieldSchema>
export type LayoutSection = z.infer<typeof layoutSectionSchema>
export type LayoutCondition = z.infer<typeof layoutConditionSchema>
export type LayoutEffect = z.infer<typeof layoutEffectSchema>
export type LayoutRule = z.infer<typeof layoutRuleSchema>
export type LayoutDefinition = z.infer<typeof layoutDefinitionSchema>
export type CreateLayoutBody = z.infer<typeof createLayoutBodySchema>
export type UpdateLayoutBody = z.infer<typeof updateLayoutBodySchema>
export type ResolveLayoutQuery = z.infer<typeof resolveLayoutQuerySchema>
export type ListLayoutsQuery = z.infer<typeof listLayoutsQuerySchema>
