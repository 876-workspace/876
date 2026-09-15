import { z } from 'zod'

const nonEmptyUpdate = (data: Record<string, unknown>) =>
  Object.keys(data).length > 0

export const taskListProjectParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const taskListParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const taskListIssueParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const listTaskListsQuerySchema = z.strictObject({
  includeArchived: z.enum(['true', 'false']).optional(),
})

export const createTaskListBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().nullable().optional(),
  milestoneId: z.string().trim().min(1).nullable().optional(),
  ownerUserId: z.string().trim().min(1).nullable().optional(),
  startDate: z.number().int().nullable().optional(),
  targetDate: z.number().int().nullable().optional(),
  position: z.number().int().optional(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export const updateTaskListBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().nullable().optional(),
    milestoneId: z.string().trim().min(1).nullable().optional(),
    ownerUserId: z.string().trim().min(1).nullable().optional(),
    startDate: z.number().int().nullable().optional(),
    targetDate: z.number().int().nullable().optional(),
    position: z.number().int().optional(),
    actorUserId: z.string().trim().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'actorUserId'), {
    message: 'At least one task list field must be provided.',
  })

export const reorderTaskListsBodySchema = z.strictObject({
  orderedIds: z.array(z.string().trim().min(1)).min(1),
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export const moveIssuesBodySchema = z.strictObject({
  issueIds: z.array(z.string().trim().min(1)).min(1).max(100),
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export const archiveTaskListBodySchema = z.strictObject({
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export type CreateTaskListBody = z.infer<typeof createTaskListBodySchema>
export type UpdateTaskListBody = z.infer<typeof updateTaskListBodySchema>
export type ReorderTaskListsBody = z.infer<typeof reorderTaskListsBodySchema>
export type MoveIssuesBody = z.infer<typeof moveIssuesBodySchema>

export function isNonEmptyUpdate(data: Record<string, unknown>): boolean {
  return nonEmptyUpdate(data)
}
