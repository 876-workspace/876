import { z } from 'zod'

import { layoutConditionSchema } from '../layouts/index.js'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const ruleParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const notificationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const automationTriggerSchema = z.enum([
  'work-item.created',
  'work-item.updated',
  'work-item.state-changed',
  'phase.completed',
  'due-date.approaching',
  'time-entry.submitted',
  'budget.threshold-reached',
])

export const automationSubjectTypeSchema = z.enum([
  'work-item',
  'phase',
  'time-entry',
  'budget',
])

export const setFieldActionSchema = z.strictObject({
  type: z.literal('set-field'),
  fieldKey: z.string().trim().min(1).max(120),
  value: z.union([
    z.string(),
    z.array(z.string()),
    z.number(),
    z.boolean(),
    z.null(),
  ]),
})

export const assignActionSchema = z.strictObject({
  type: z.literal('assign'),
  userId: z.string().trim().min(1),
})

export const addLabelActionSchema = z.strictObject({
  type: z.literal('add-label'),
  label: z.string().trim().min(1),
})

export const removeLabelActionSchema = z.strictObject({
  type: z.literal('remove-label'),
  label: z.string().trim().min(1),
})

export const createReminderActionSchema = z.strictObject({
  type: z.literal('create-reminder'),
  title: z.string().trim().min(1).max(200).optional(),
  remindAt: z.number().int().nonnegative().optional(),
  offsetMinutesBeforeDue: z.number().int().min(0).max(525600).optional(),
})

export const createEventActionSchema = z.strictObject({
  type: z.literal('create-event'),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).nullable().optional(),
  startsAt: z.number().int().nonnegative(),
  endsAt: z.number().int().nonnegative().nullable().optional(),
})

export const notifyActionSchema = z.strictObject({
  type: z.literal('notify'),
  userId: z.string().trim().min(1),
  kind: z.string().trim().min(1).max(60).optional(),
  title: z.string().trim().min(1).max(200),
})

export const callWebhookActionSchema = z.strictObject({
  type: z.literal('call-webhook'),
  url: z.string().trim().url().max(2000),
})

export const createSubItemActionSchema = z.strictObject({
  type: z.literal('create-sub-item'),
  title: z.string().trim().min(1).max(300),
  typeKey: z.string().trim().min(1).optional(),
  assigneeUserId: z.string().trim().nullable().optional(),
})

export const automationActionSchema = z.discriminatedUnion('type', [
  setFieldActionSchema,
  assignActionSchema,
  addLabelActionSchema,
  removeLabelActionSchema,
  createReminderActionSchema,
  createEventActionSchema,
  notifyActionSchema,
  callWebhookActionSchema,
  createSubItemActionSchema,
])

export const createRuleBodySchema = z.strictObject({
  projectId: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1).max(120),
  enabled: z.boolean().optional(),
  trigger: automationTriggerSchema,
  conditions: z.array(layoutConditionSchema).max(25).optional(),
  actions: z.array(automationActionSchema).min(1).max(10),
  webhookSecret: z.string().min(1).max(500).nullable().optional(),
})

export const updateRuleBodySchema = z
  .strictObject({
    projectId: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(1).max(120).optional(),
    enabled: z.boolean().optional(),
    trigger: automationTriggerSchema.optional(),
    conditions: z.array(layoutConditionSchema).max(25).optional(),
    actions: z.array(automationActionSchema).min(1).max(10).optional(),
    webhookSecret: z.string().min(1).max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const testRuleBodySchema = z.strictObject({
  subjectId: z.string().trim().min(1),
})

export const listNotificationsQuerySchema = z.strictObject({
  userId: z.string().trim().min(1),
})

export const drainBodySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export type AutomationTrigger = z.infer<typeof automationTriggerSchema>
export type AutomationSubjectType = z.infer<
  typeof automationSubjectTypeSchema
>
export type AutomationAction = z.infer<typeof automationActionSchema>
export type CreateRuleBody = z.infer<typeof createRuleBodySchema>
export type UpdateRuleBody = z.infer<typeof updateRuleBodySchema>
export type TestRuleBody = z.infer<typeof testRuleBodySchema>
