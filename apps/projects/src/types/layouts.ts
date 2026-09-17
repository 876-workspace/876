import type {
  LayoutEntity,
  LayoutRule,
  LayoutSection,
} from '@876/projects/contracts'
import { z } from 'zod'

const customModuleEntitySchema = z
  .string()
  .regex(/^custom-module:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)

const entitySchema = z.union([
  z.enum(['project', 'phase', 'work-item']),
  customModuleEntitySchema,
]) as z.ZodType<LayoutEntity>

const layoutFieldSchema = z.strictObject({
  fieldKey: z.string().trim().min(1).max(120),
  width: z.union([z.literal(1), z.literal(2)]),
  visible: z.boolean(),
})

const layoutSectionSchema = z.strictObject({
  key: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  columns: z.union([z.literal(1), z.literal(2)]),
  fields: z.array(layoutFieldSchema).min(1),
})

const layoutConditionSchema = z.strictObject({
  fieldKey: z.string().trim().min(1).max(120),
  op: z.enum(['equals', 'not-equals', 'in', 'is-empty', 'is-not-empty']),
  value: z.union([z.string(), z.array(z.string())]).optional(),
})

const layoutEffectSchema = z.strictObject({
  fieldKey: z.string().trim().min(1).max(120),
  effect: z.enum(['show', 'hide', 'require', 'disable']),
})

const layoutRuleSchema = z.strictObject({
  key: z.string().trim().min(1).max(120),
  when: z.array(layoutConditionSchema).min(1),
  then: z.array(layoutEffectSchema).min(1),
})

const definitionSchema = z.strictObject({
  sections: z.array(layoutSectionSchema).min(1),
  rules: z.array(layoutRuleSchema).optional(),
})

export const createLayoutInputSchema = z.strictObject({
  entity: entitySchema,
  workItemTypeId: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1).max(100),
  definition: definitionSchema,
  isDefault: z.boolean().optional(),
})

export const updateLayoutInputSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100).optional(),
    definition: definitionSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0)

export const listLayoutsQuerySchema = z.strictObject({
  entity: entitySchema.optional(),
  workItemTypeId: z.string().trim().min(1).optional(),
})

export const resolveLayoutQuerySchema = z.strictObject({
  entity: entitySchema,
  workItemTypeId: z.string().trim().min(1).optional(),
})

export type CreateLayoutBody = z.infer<typeof createLayoutInputSchema>

export type AvailableLayoutField = { fieldKey: string; label: string }

export type LayoutDefinitionInput = {
  sections: LayoutSection[]
  rules?: LayoutRule[]
}

export type CreateLayoutParams = {
  entity: LayoutEntity
  workItemTypeId?: string | null
  name: string
  definition: LayoutDefinitionInput
  isDefault?: boolean
}

export type UpdateLayoutParams = {
  name?: string
  definition?: LayoutDefinitionInput
}
