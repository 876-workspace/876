import { z } from 'zod'

import { workEventResourceSchema } from './event-contracts'
import { workReminderSchema, workTaskSchema } from './types'

export const workMyWorkSchema = z.object({
  object: z.literal('my_work'),
  organizationId: z.string(),
  userId: z.string(),
  from: z.number().int(),
  to: z.number().int(),
  tasks: z.array(workTaskSchema),
  reminders: z.array(workReminderSchema),
  events: z.array(workEventResourceSchema),
  overdueTasks: z.array(workTaskSchema),
})
export type WorkMyWork = z.infer<typeof workMyWorkSchema>

export type WorkMyWorkFilter = {
  from: number
  to: number
  userId?: string
}
