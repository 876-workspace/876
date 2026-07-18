import * as z from 'zod'

/**
 * Self-describing payload with an object type discriminator.
 */
export interface ApiObject<ObjectName extends string = string> {
  /**
   * String representing the object's type.
   */
  object: ObjectName
}

/**
 * Success branch of the application result envelope.
 */
export interface ApiSuccessResult<TSuccess> {
  /**
   * Successful payload.
   */
  data: TSuccess
  /**
   * Always null on success.
   */
  error: null
}

/**
 * Error branch of the application result envelope.
 */
export interface ApiErrorResult<TError> {
  /**
   * Always null on error.
   */
  data: null
  /**
   * Serialized error payload.
   */
  error: TError
}

/**
 * Application result envelope with success and error branches.
 */
export type ApiResult<TSuccess, TError> =
  | ApiSuccessResult<TSuccess>
  | ApiErrorResult<TError>

/**
 * Paginated list container.
 */
export interface ApiList<
  TItem extends ApiObject<string>,
> extends ApiObject<'list'> {
  /**
   * The URL for this list.
   */
  url: string
  /**
   * The list data.
   */
  data: TItem[]
  /**
   * Whether there are more items after this page.
   */
  has_more: boolean
  /**
   * Total number of items, when available.
   */
  total_count?: number
}

/**
 * Search result container.
 */
export interface ApiSearchResult<
  TItem extends ApiObject<string>,
> extends ApiObject<'search_result'> {
  /**
   * The URL for this search.
   */
  url: string
  /**
   * The search result data.
   */
  data: TItem[]
  /**
   * Whether there are more items after this page.
   */
  has_more: boolean
  /**
   * A cursor for fetching the next page of results.
   */
  next_page: string | null
  /**
   * Total number of results, when available.
   */
  total_count?: number
}

/**
 * Optional per-request configuration for app SDK calls.
 */
export interface RequestOptions {
  /**
   * Optional signal used to abort the request.
   */
  signal?: AbortSignal
}

/**
 * Creates a strict Zod schema for an `ApiList` container.
 *
 * @param itemSchema - The schema used to validate each list item.
 * @returns A strict Zod schema that validates an `ApiList` container.
 */
export function apiListSchema<TItem extends ApiObject<string>>(
  itemSchema: z.ZodType<TItem>
): z.ZodType<ApiList<TItem>> {
  return z.strictObject({
    object: z.literal('list'),
    data: z.array(itemSchema),
    has_more: z.boolean(),
    total_count: z.int().nonnegative().optional(),
    url: z.string().trim().min(1),
  })
}

/**
 * Creates a strict Zod schema for an `ApiSearchResult` container.
 *
 * @param itemSchema - The schema used to validate each search result item.
 * @returns A strict Zod schema that validates an `ApiSearchResult` container.
 */
export function apiSearchResultSchema<TItem extends ApiObject<string>>(
  itemSchema: z.ZodType<TItem>
): z.ZodType<ApiSearchResult<TItem>> {
  return z.strictObject({
    object: z.literal('search_result'),
    data: z.array(itemSchema),
    has_more: z.boolean(),
    next_page: z.string().trim().min(1).nullable(),
    total_count: z.int().nonnegative().optional(),
    url: z.string().trim().min(1),
  })
}
