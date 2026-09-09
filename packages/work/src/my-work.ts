import { z } from 'zod'

import { workEventResourceSchema } from './event-contracts'
import { workReminderSchema, workTaskSchema } from './types'

export const workAgendaDataSchema = z.object({
  organizationId: z.string(),
  from: z.number().int(),
  to: z.number().int(),
  tasks: z.array(workTaskSchema),
  reminders: z.array(workReminderSchema),
  events: z.array(workEventResourceSchema),
  overdueTasks: z.array(workTaskSchema),
})
export type WorkAgendaData = z.infer<typeof workAgendaDataSchema>

export const workMyWorkSchema = workAgendaDataSchema.extend({
  object: z.literal('my_work'),
  userId: z.string(),
})
export type WorkMyWork = z.infer<typeof workMyWorkSchema>

export type WorkMyWorkFilter = {
  from: number
  to: number
  userId?: string
}
