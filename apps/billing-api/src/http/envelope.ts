import { z } from 'zod'

export const errorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})

export const errorEnvelopeSchema = z.object({
  data: z.null(),
  error: errorDetailSchema,
})

export function successEnvelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({ data, error: z.null() })
}

export function listObjectSchema<T extends z.ZodType>(item: T) {
  return z.object({
    object: z.literal('list'),
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
