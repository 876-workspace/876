import { z } from 'zod'

import { customFieldValueInputSchema } from '../work-structure/work-structure.schemas.js'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const issueParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  issueRef: z.string().trim().min(1),
})

export const issueStatusSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)

export const issuePrioritySchema = z.enum([
  'none',
  'low',
  'medium',
  'high',
  'urgent',
])

export const issueOrderSchema = z.enum([
  'manual',
  'updated',
  'created',
  'priority',
])

export const listIssuesQuerySchema = z
  .strictObject({
    project: z.string().trim().min(1).optional(),
    milestoneId: z.string().trim().min(1).optional(),
    typeKey: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional(),
    priority: z.string().trim().min(1).optional(),
    assignee: z.string().trim().min(1).optional(),
    label: z.union([z.string(), z.array(z.string())]).optional(),
    parent: z.string().trim().min(1).optional(),
    q: z.string().trim().min(1).optional(),
    updated_since: z.coerce.number().int().nonnegative().optional(),
    include_deleted: z.enum(['true', 'false']).optional(),
    order: issueOrderSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'starting_after and ending_before are mutually exclusive',
  })

export const createIssueBodySchema = z.strictObject({
  projectId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().nullable().optional(),
  status: issueStatusSchema.optional(),
  typeKey: z.string().trim().min(1).optional(),
  milestoneId: z.string().trim().nullable().optional(),
  taskListId: z.string().trim().nullable().optional(),
  cycleId: z.string().trim().nullable().optional(),
  priority: issuePrioritySchema.optional(),
  assigneeUserId: z.string().trim().nullable().optional(),
  creatorUserId: z.string().trim().nullable().optional(),
  parentIssueId: z.string().trim().nullable().optional(),
  estimate: z.number().int().min(0).max(100).nullable().optional(),
  dueDate: z.number().int().nullable().optional(),
  plannedStartDate: z.number().int().nullable().optional(),
  plannedFinishDate: z.number().int().nullable().optional(),
  plannedDurationMinutes: z.number().int().min(0).nullable().optional(),
  labelIds: z.array(z.string().trim().min(1)).optional(),
  customFields: z.array(customFieldValueInputSchema).optional(),
  position: z.number().int().optional(),
})

export const issueVisibilityBodySchema = z.strictObject({
  clientVisible: z.boolean(),
})

export type IssueVisibilityBody = z.infer<typeof issueVisibilityBodySchema>

export const updateIssueBodySchema = z
  .strictObject({
    projectId: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().nullable().optional(),
    status: issueStatusSchema.optional(),
    typeKey: z.string().trim().min(1).optional(),
    milestoneId: z.string().trim().nullable().optional(),
    taskListId: z.string().trim().nullable().optional(),
    cycleId: z.string().trim().nullable().optional(),
    priority: issuePrioritySchema.optional(),
    assigneeUserId: z.string().trim().nullable().optional(),
    creatorUserId: z.string().trim().nullable().optional(),
    parentIssueId: z.string().trim().nullable().optional(),
    estimate: z.number().int().min(0).max(100).nullable().optional(),
    dueDate: z.number().int().nullable().optional(),
    plannedStartDate: z.number().int().nullable().optional(),
    plannedFinishDate: z.number().int().nullable().optional(),
    plannedDurationMinutes: z.number().int().min(0).nullable().optional(),
    labelIds: z.array(z.string().trim().min(1)).optional(),
    customFields: z.array(customFieldValueInputSchema).optional(),
    position: z.number().int().optional(),
    actorUserId: z.string().trim().nullable().optional(),
    comment: z.string().trim().max(10000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type IssueStatus = z.infer<typeof issueStatusSchema>
export type IssuePriority = z.infer<typeof issuePrioritySchema>
export type IssueOrder = z.infer<typeof issueOrderSchema>
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>
export type CreateIssueBody = z.infer<typeof createIssueBodySchema>
export type UpdateIssueBody = z.infer<typeof updateIssueBodySchema>
