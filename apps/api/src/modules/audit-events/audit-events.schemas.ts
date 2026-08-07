import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

/**
 * The platform audit and client-telemetry trail.
 *
 * Every optional string is trimmed and an empty result becomes `null`, matching
 * the Pydantic validators this replaces: a browser that posts `title: ""` should
 * not create a row that reads as "the title is the empty string".
 */

const trimmedRequired = (max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1).max(max))

const trimmedOptional = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((value) => {
      if (value === undefined) return null
      const trimmed = value.trim()
      return trimmed === '' ? null : trimmed
    })

export const auditEventSchema = z
  .object({
    object: z
      .literal('audit_event')
      .meta({ description: "Always 'audit_event'." }),
    id: z.string(),
    event: z.string(),
    source: z.string(),
    app_name: z.string(),
    app_id: z.string().nullable(),
    user_id: z.string().nullable(),
    path: z.string().nullable(),
    search: z.string().nullable(),
    referrer: z.string().nullable(),
    title: z.string().nullable(),
    request_id: z.string().nullable(),
    session_id: z.string().nullable(),
    distinct_id: z.string().nullable(),
    properties: z.record(z.string(), z.unknown()),
    created_at: z.number().int(),
  })
  .meta({ id: 'AuditEvent' })

export const createAuditEventBodySchema = z.strictObject({
  event: trimmedRequired(120).meta({
    description: 'Machine-readable event name.',
  }),
  source: trimmedRequired(40)
    .default('client')
    .meta({ description: 'Telemetry source.' }),
  app_name: trimmedRequired(80).meta({
    description: 'Application that emitted the event.',
  }),
  user_id: trimmedOptional(120).meta({
    description: 'Canonical user ID, when known.',
  }),
  path: trimmedOptional(500).meta({ description: 'Page path, if relevant.' }),
  search: trimmedOptional(500).meta({
    description: 'URL search string, if relevant.',
  }),
  referrer: trimmedOptional(1000).meta({
    description: 'Document referrer, if present.',
  }),
  title: trimmedOptional(300).meta({
    description: 'Document title, if present.',
  }),
  request_id: trimmedOptional(120).meta({
    description: 'Request ID for correlation.',
  }),
  session_id: trimmedOptional(120).meta({
    description: 'Browser/session correlation ID.',
  }),
  distinct_id: trimmedOptional(120).meta({
    description: 'Analytics distinct ID, when known.',
  }),
  properties: z
    .record(z.string(), z.unknown())
    .default({})
    .meta({ description: 'Sanitized event context.' }),
})

export const listAuditEventsQuerySchema = paginationQuerySchema.extend({
  app_name: z.string().optional(),
  event: z.string().optional(),
  user_id: z.string().optional(),
  path: z.string().optional(),
  q: z.string().optional(),
})

export type AuditEvent = z.infer<typeof auditEventSchema>
export type CreateAuditEventBody = z.infer<typeof createAuditEventBodySchema>
export type ListAuditEventsQuery = z.infer<typeof listAuditEventsQuerySchema>
