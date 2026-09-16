import { z } from 'zod'

export const automationTriggerInputSchema = z.enum([
  'work-item.created',
  'work-item.updated',
  'work-item.state-changed',
  'phase.completed',
  'due-date.approaching',
  'time-entry.submitted',
  'budget.threshold-reached',
])

export const automationConditionInputSchema = z.strictObject({
  fieldKey: z.string().trim().min(1).max(120),
  op: z.enum(['equals', 'not-equals', 'in', 'is-empty', 'is-not-empty']),
  value: z.union([z.string(), z.array(z.string().trim().min(1))]).optional(),
})

export const automationActionInputSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('set-field'),
    fieldKey: z.string().trim().min(1),
    value: z.union([
      z.string(),
      z.array(z.string().trim().min(1)),
      z.number(),
      z.boolean(),
      z.null(),
    ]),
  }),
  z.strictObject({
    type: z.literal('assign'),
    userId: z.string().trim().min(1),
  }),
  z.strictObject({
    type: z.literal('add-label'),
    label: z.string().trim().min(1),
  }),
  z.strictObject({
    type: z.literal('remove-label'),
    label: z.string().trim().min(1),
  }),
  z.strictObject({
    type: z.literal('create-reminder'),
    title: z.string().trim().min(1).max(300).optional(),
    remindAt: z.number().int().optional(),
    offsetMinutesBeforeDue: z.number().int().optional(),
  }),
  z.strictObject({
    type: z.literal('create-event'),
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(5000).nullable().optional(),
    startsAt: z.number().int(),
    endsAt: z.number().int().nullable().optional(),
  }),
  z.strictObject({
    type: z.literal('notify'),
    userId: z.string().trim().min(1),
    kind: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().min(1).max(300),
  }),
  z.strictObject({
    type: z.literal('call-webhook'),
    url: z.string().trim().min(1).max(2000),
  }),
  z.strictObject({
    type: z.literal('create-sub-item'),
    title: z.string().trim().min(1).max(300),
    typeKey: z.string().trim().min(1).max(100).optional(),
    assigneeUserId: z.string().trim().min(1).nullable().optional(),
  }),
])

export type AutomationActionInput = z.infer<typeof automationActionInputSchema>

export const createAutomationRuleInputSchema = z.strictObject({
  projectId: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  enabled: z.boolean().optional(),
  trigger: automationTriggerInputSchema,
  conditions: z.array(automationConditionInputSchema).max(50).optional(),
  actions: z.array(automationActionInputSchema).max(50),
  webhookSecret: z.string().max(500).nullable().optional(),
})

export const updateAutomationRuleInputSchema = z
  .strictObject({
    projectId: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    enabled: z.boolean().optional(),
    trigger: automationTriggerInputSchema.optional(),
    conditions: z.array(automationConditionInputSchema).max(50).optional(),
    actions: z.array(automationActionInputSchema).max(50).optional(),
    webhookSecret: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
  })

export const testAutomationRuleInputSchema = z.strictObject({
  subjectId: z.string().trim().min(1),
  projectId: z.string().trim().min(1).optional(),
})

const blueprintTransitionInputSchema = z.strictObject({
  id: z.string().nullable().optional(),
  fromStateKey: z.string().trim().min(1).nullable().optional(),
  toStateKey: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200),
  requiredPermission: z.string().trim().min(1).nullable().optional(),
  requiredFieldKeys: z
    .array(z.string().trim().min(1).max(120))
    .max(100)
    .optional(),
  requiresComment: z.boolean().optional(),
})

export const putBlueprintInputSchema = z.strictObject({
  transitions: z.array(blueprintTransitionInputSchema).max(200),
})
