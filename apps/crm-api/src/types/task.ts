import type { z } from 'zod'

import type {
  createReminderBodySchema,
  createTaskBodySchema,
  updateReminderBodySchema,
  updateTaskBodySchema,
} from '../modules/requests/requests.schemas.js'

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type ReminderStatus = 'SCHEDULED' | 'SENT' | 'DISMISSED' | 'CANCELLED'
export type CreateTaskInput = z.infer<typeof createTaskBodySchema>
export type UpdateTaskInput = z.infer<typeof updateTaskBodySchema>
export type CreateReminderInput = z.infer<typeof createReminderBodySchema>
export type UpdateReminderInput = z.infer<typeof updateReminderBodySchema>
