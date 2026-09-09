import {
  createWorkTaskAssignmentInputSchema,
  updateWorkTaskAssignmentInputSchema,
  workTaskAssignmentResponseInputSchema,
} from '@876/work'
import { z } from 'zod'

export const taskParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  taskId: z.string().trim().min(1),
})
export const assignmentParamsSchema = taskParamsSchema.extend({
  assignmentId: z.string().trim().min(1),
})
export const createAssignmentBodySchema = createWorkTaskAssignmentInputSchema
export const updateAssignmentBodySchema = updateWorkTaskAssignmentInputSchema
export const assignmentResponseBodySchema =
  workTaskAssignmentResponseInputSchema
