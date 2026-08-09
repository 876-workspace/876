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

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export async function paginateByCursor<Row>(options: {
  query: PaginationQuery
  loadAnchor: (id: string) => Promise<Row | null>
  cursorOf: (row: Row) => bigint | number | string
  fetch: (args: {
    take: number
    cursor?: { value: bigint | number | string; direction: 'lt' | 'gt' }
    order: 'desc' | 'asc'
  }) => Promise<Row[]>
}): Promise<{ data: Row[]; hasMore: boolean }> {
  const { query, loadAnchor, cursorOf, fetch } = options
  const take = query.limit + 1

  if (query.starting_after) {
    const anchor = await loadAnchor(query.starting_after)
    if (!anchor) return { data: [], hasMore: false }
    const rows = await fetch({
      take,
      cursor: { value: cursorOf(anchor), direction: 'lt' },
      order: 'desc',
    })
    return {
      data: rows.slice(0, query.limit),
      hasMore: rows.length > query.limit,
    }
  }

  if (query.ending_before) {
    const anchor = await loadAnchor(query.ending_before)
    if (!anchor) return { data: [], hasMore: false }
    const rows = await fetch({
      take,
      cursor: { value: cursorOf(anchor), direction: 'gt' },
      order: 'asc',
    })
    return {
      data: rows.slice(0, query.limit).reverse(),
      hasMore: rows.length > query.limit,
    }
  }

  const rows = await fetch({ take, order: 'desc' })
  return {
    data: rows.slice(0, query.limit),
    hasMore: rows.length > query.limit,
  }
}
