import { z } from 'zod'

export const healthSchema = z.object({
  object: z.literal('health'),
  status: z.literal('ok'),
  service: z.literal('@876/billing-api'),
})

export const readinessSchema = z.object({
  object: z.literal('readiness'),
  status: z.enum(['ready', 'not_ready']),
  service: z.literal('@876/billing-api'),
  migration: z.enum(['current', 'pending', 'unavailable']),
  writer: z.enum(['legacy', 'fastapi', 'express', 'none']),
})
