import { createWorkEventInputSchema, updateWorkEventInputSchema, workEventStatusSchema } from '@876/work'
import { z } from 'zod'
const contextShape = { context_service: z.string().trim().min(1).optional(), context_resource: z.string().trim().min(1).optional(), context_id: z.string().trim().min(1).optional() }
export const organizationParamsSchema = z.strictObject({ organizationId: z.string().trim().min(1) })
export const eventParamsSchema = organizationParamsSchema.extend({ eventId: z.string().trim().min(1) })
export const listEventsQuerySchema = z.strictObject({ calendar_id: z.string().trim().min(1).optional(), ...contextShape, from: z.coerce.number().int().optional(), to: z.coerce.number().int().optional(), status: workEventStatusSchema.optional(), limit: z.coerce.number().int().min(1).max(100).default(25), starting_after: z.string().trim().min(1).optional(), ending_before: z.string().trim().min(1).optional() }).superRefine((q,ctx) => { const count=[q.context_service,q.context_resource,q.context_id].filter(Boolean).length; if(count!==0&&count!==3)ctx.addIssue({code:'custom',message:'Context filters must be supplied together.'}); if(q.starting_after&&q.ending_before)ctx.addIssue({code:'custom',message:'Only one cursor may be provided.'}); if(q.from&&q.to&&q.to<=q.from)ctx.addIssue({code:'custom',message:'to must be after from.'}) })
const contextInput = z.object({ context: z.object({ service:z.string().min(1), resource:z.string().min(1), id:z.string().min(1) }).nullable().optional() })
export const createEventBodySchema = createWorkEventInputSchema.and(contextInput)
export const updateEventBodySchema = updateWorkEventInputSchema.and(contextInput)
export const deleteEventBodySchema = z.strictObject({ deletedBy: z.string().trim().min(1) })
