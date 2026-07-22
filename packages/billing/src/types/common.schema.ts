import { z } from 'zod'

/**
 * Builds a Zod schema for a created-resource response `{ object, id }`.
 */
export function createdResourceSchema<const TObject extends string>(
  object: TObject
) {
  return z.strictObject({
    object: z.literal(object),
    id: z.string().min(1),
  })
}

/**
 * Builds a Zod schema for a deleted-resource tombstone `{ object, id, deleted }`.
 */
export function deletedResourceSchema<const TObject extends string>(
  object: TObject
) {
  return z.strictObject({
    object: z.literal(object),
    id: z.string().min(1),
    deleted: z.literal(true),
  })
}

/**
 * Builds a list-container schema for a resource item schema.
 */
export function listSchema<T>(itemSchema: z.ZodType<T>) {
  return z.strictObject({
    object: z.literal('list'),
    data: z.array(itemSchema),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
}
