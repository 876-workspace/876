import { z } from 'zod'

/**
 * The platform response envelope and list container.
 *
 * Every JSON response is `{ data, error }` — the envelope is applied by
 * middleware so a controller returns the resource itself and never hand-builds
 * it. Lists are always the Stripe-style list object
 * (.claude/rules/stripe-api-pattern.md).
 */

export const errorDetailSchema = z
  .object({
    code: z.string().meta({
      description: "Machine-readable error code, e.g. 'auth/not-found'.",
    }),
    message: z.string().meta({ description: 'Human-readable error message.' }),
  })
  .meta({
    id: 'ErrorDetail',
    example: { code: 'auth/no-session', message: 'No active session.' },
  })

export const errorEnvelopeSchema = z
  .object({ error: errorDetailSchema.meta({ description: 'Error detail.' }) })
  .meta({
    id: 'ErrorEnvelope',
    example: {
      error: { code: 'auth/no-session', message: 'No active session.' },
    },
  })

export function listObjectSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    object: z.literal('list').meta({ description: "Always 'list'." }),
    data: z.array(item).meta({ description: 'Array of objects in this page.' }),
    has_more: z.boolean().meta({
      description: 'Whether there are more objects beyond this page.',
    }),
    url: z.string().meta({ description: 'The URL for this list endpoint.' }),
    total_count: z
      .number()
      .int()
      .nullable()
      .meta({ description: 'Total number of objects, if available.' }),
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

/** `{ object: "user", id, deleted: true }` — the deletion tombstone. */
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

/* ------------------------------------------------------------------ *
 * Cursor pagination
 * ------------------------------------------------------------------ */

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

/**
 * Resolve one page of a cursor-paginated list.
 *
 * The semantics match the FastAPI repository helper exactly, because the
 * cursors it produced are already in client hands:
 *
 *   - the natural order is DESC on the cursor column
 *   - `starting_after` walks forward: rows strictly below the anchor, DESC
 *   - `ending_before` walks back: rows strictly above the anchor, ASC, then
 *     reversed so the caller always receives DESC
 *   - an unknown anchor yields an empty page rather than an error
 *   - `limit + 1` rows are fetched to decide `has_more` without a count query
 *
 * `fetch` receives the resolved direction and returns at most `take` rows.
 */
export async function paginateByCursor<Row>(options: {
  query: PaginationQuery
  /** Read the cursor column off an anchor row; `null` when the anchor is unknown. */
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
    // Return DESC regardless of which way we walked, so the caller's ordering
    // never depends on which cursor they passed.
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
