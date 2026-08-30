import {
  createWorkCalendarSubscriptionInputSchema,
  updateWorkCalendarSubscriptionInputSchema,
} from '@876/work'
import { z } from 'zod'
export const calendarParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  calendarId: z.string().trim().min(1),
})
export const subscriptionParamsSchema = calendarParamsSchema.extend({
  subscriptionId: z.string().trim().min(1),
})
export const createSubscriptionBodySchema =
  createWorkCalendarSubscriptionInputSchema
export const updateSubscriptionBodySchema =
  updateWorkCalendarSubscriptionInputSchema
