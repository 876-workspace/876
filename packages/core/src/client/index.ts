
export type CursorPageParams = {
  limit?: number | undefined
  startingAfter?: string | undefined
  endingBefore?: string | undefined
}

/**
 * Maps public {@link CursorPageParams} onto the FastAPI list cursor query keys.
 *
 * Undefined fields are preserved and dropped later by `buildClientQuery`.
 */
 {
  return {
    limit: params.limit,
    starting_after: params.startingAfter,
    ending_before: params.endingBefore,
  }
}

/** Serializes defined params into a `?key=value` query string (or `''`). */
export function buildClientQuery(
  params: Record<string, string | number | boolean | undefined>
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

/**
 * Resolves a path against an absolute or same-origin base URL, appending
 * query parameters when present.
 */
export function resolveClientUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  const queryString = query ? buildClientQuery(query) : ''
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  // Absolute URL: use the URL constructor for proper resolution.
  if (base.startsWith('http://') || base.startsWith('https://'))
    return `${new URL(path, base).toString()}${queryString}`

  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${base}${cleanPath}${queryString}`
}
