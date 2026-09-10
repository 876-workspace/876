import {
  createWorkSyncConnectionInputSchema,
  linkWorkRemoteCalendarInputSchema,
  updateWorkSyncConnectionInputSchema,
  workSyncConnectionSetupInputSchema,
  workSyncConnectionStatusSchema,
  workSyncProviderSchema,
} from '@876/work'
import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
export const connectionParamsSchema = organizationParamsSchema.extend({
  connectionId: z.string().trim().min(1),
})
export const calendarLinkParamsSchema = connectionParamsSchema.extend({
  mappingId: z.string().trim().min(1),
})
export const listConnectionsQuerySchema = z
  .strictObject({
    user_id: z.string().trim().min(1).optional(),
    provider: workSyncProviderSchema.optional(),
    status: workSyncConnectionStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .refine((q) => !(q.starting_after && q.ending_before), {
    message: 'Only one cursor may be provided.',
  })

export const createConnectionBodySchema = createWorkSyncConnectionInputSchema
export const updateConnectionBodySchema = updateWorkSyncConnectionInputSchema
export const setupConnectionBodySchema = workSyncConnectionSetupInputSchema
export const linkCalendarBodySchema = linkWorkRemoteCalendarInputSchema

export const oauthProviderParamsSchema = z.strictObject({
  provider: z.enum(['google', 'microsoft']),
})
// OAuth providers may append provider-owned diagnostic/query fields. Only the
// three fields below affect Work; extras are ignored rather than reflected.
export const oauthCallbackQuerySchema = z.object({
  state: z.string().trim().min(1),
  code: z.string().trim().min(1).optional(),
  error: z.string().trim().min(1).optional(),
})
