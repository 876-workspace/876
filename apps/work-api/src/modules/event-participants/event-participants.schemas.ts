import {
  createWorkEventParticipantInputSchema,
  updateWorkEventParticipantInputSchema,
} from '@876/work'
import { z } from 'zod'
export const eventParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  eventId: z.string().trim().min(1),
})
export const participantParamsSchema = eventParamsSchema.extend({
  participantId: z.string().trim().min(1),
})
export const createParticipantBodySchema = createWorkEventParticipantInputSchema
export const updateParticipantBodySchema = updateWorkEventParticipantInputSchema
