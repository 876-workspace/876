import { z } from 'zod'

/**
 * Statuses an assigned user may choose for their own task assignment.
 * Assignment creation/management remains a separate `tasks.assign` capability.
 */
export const workTaskAssignmentResponseStatusSchema = z.enum([
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
])
export type WorkTaskAssignmentResponseStatus = z.infer<
  typeof workTaskAssignmentResponseStatusSchema
>

export const workTaskAssignmentResponseInputSchema = z.strictObject({
  status: workTaskAssignmentResponseStatusSchema,
})
export type WorkTaskAssignmentResponseInput = z.infer<
  typeof workTaskAssignmentResponseInputSchema
>

/**
 * RSVP-like states a participant may choose for their own user participant.
 * Adding/removing participants remains a separate `events.invite` capability.
 */
export const workEventParticipantResponseStatusSchema = z.enum([
  'ACCEPTED',
  'DECLINED',
  'TENTATIVE',
])
export type WorkEventParticipantResponseStatus = z.infer<
  typeof workEventParticipantResponseStatusSchema
>

export const workEventParticipantResponseInputSchema = z.strictObject({
  status: workEventParticipantResponseStatusSchema,
})
export type WorkEventParticipantResponseInput = z.infer<
  typeof workEventParticipantResponseInputSchema
>
