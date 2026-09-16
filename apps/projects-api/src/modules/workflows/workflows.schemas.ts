import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const blueprintParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  workItemTypeId: z.string().trim().min(1),
})

const stateKeySchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)

export const transitionInputSchema = z.strictObject({
  fromStateKey: stateKeySchema.nullable().optional(),
  toStateKey: stateKeySchema,
  name: z.string().trim().min(1).max(120),
  requiredPermission: z.string().trim().min(1).max(120).nullable().optional(),
  requiredFieldKeys: z
    .array(z.string().trim().min(1).max(120))
    .max(50)
    .optional(),
  requiresComment: z.boolean().optional(),
})

export const blueprintBodySchema = z.strictObject({
  transitions: z.array(transitionInputSchema).max(200),
})

export type TransitionInput = z.infer<typeof transitionInputSchema>
export type BlueprintBody = z.infer<typeof blueprintBodySchema>
