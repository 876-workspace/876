import { z } from 'zod'

import { workAgendaDataSchema } from './my-work'
import { workResourceRefSchema, type WorkResourceRef } from './resource-ref'

export const workResourceWorkSchema = workAgendaDataSchema.extend({
  object: z.literal('resource_work'),
  context: workResourceRefSchema,
})
export type WorkResourceWork = z.infer<typeof workResourceWorkSchema>

export const MAX_RESOURCE_WORK_WINDOW_SECONDS = 62 * 24 * 60 * 60

export type WorkResourceWorkFilter = {
  from: number
  to: number
  context: WorkResourceRef
}
