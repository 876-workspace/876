import { z } from 'zod'

export const cycleParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const cycleIssueParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
  issueId: z.string().trim().min(1),
})

export const listCyclesQuerySchema = z.strictObject({
  projectId: z.string().trim().min(1).optional(),
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
})

export const createCycleBodySchema = z.strictObject({
  projectId: z.string().trim().min(1).nullable().optional(),
  number: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().nullable().optional(),
  goal: z.string().trim().nullable().optional(),
  startsAt: z.number().int(),
  endsAt: z.number().int(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export const updateCycleBodySchema = z
  .strictObject({
    projectId: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().nullable().optional(),
    goal: z.string().trim().nullable().optional(),
    startsAt: z.number().int().optional(),
    endsAt: z.number().int().optional(),
    completedAt: z.number().int().nullable().optional(),
    actorUserId: z.string().trim().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'actorUserId'), {
    message: 'At least one cycle field must be provided.',
  })

export const assignCycleIssuesBodySchema = z.strictObject({
  issueIds: z.array(z.string().trim().min(1)).min(1).max(100),
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export const unassignCycleIssueQuerySchema = z.strictObject({
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export type CreateCycleBody = z.infer<typeof createCycleBodySchema>
export type UpdateCycleBody = z.infer<typeof updateCycleBodySchema>
export type AssignCycleIssuesBody = z.infer<typeof assignCycleIssuesBodySchema>
