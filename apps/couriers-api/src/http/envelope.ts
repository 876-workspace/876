import { z } from 'zod'

export const errorDetailSchema = z
  .object({
    code: z.string().meta({ description: 'Machine-readable error code.' }),
    message: z.string().meta({ description: 'Human-readable error message.' }),
  })
  .meta({
    id: 'ErrorDetail',
    example: { code: 'auth/no-session', message: 'No active session.' },
  })

export const errorEnvelopeSchema = z
  .object({
    data: z.null(),
    error: errorDetailSchema.meta({ description: 'Error detail.' }),
  })
  .meta({ id: 'ErrorEnvelope' })

export function successEnvelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({ data, error: z.null() })
}

export function listObjectSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    object: z.literal('list').meta({ description: "Always 'list'." }),
    data: z.array(item),
    has_more: z.boolean(),
    url: z.string(),
    total_count: z.number().int().nullable(),
  })
}

export type ListObject<T> = {
  object: 'list'
  data: T[]
  has_more: boolean
  url: string
  total_count: number | null
}

export function listObject<T>(options: {
  data: T[]
  hasMore: boolean
  url: string
  totalCount?: number | null
}): ListObject<T> {
  return {
    object: 'list',
    data: options.data,
    has_more: options.hasMore,
    url: options.url,
    total_count: options.totalCount ?? null,
  }
}

export function deletedObject(object: string, id: string) {
  return { object, id, deleted: true as const }
}

export function deletedObjectSchema(object: string) {
  return z.object({
    object: z.literal(object),
    id: z.string(),
    deleted: z.literal(true),
  })
}
