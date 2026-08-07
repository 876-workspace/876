/**
 * Rules shared by the three directory resource groups.
 *
 * `resolveIncludeDeleted` is the one that matters. The FastAPI routes each
 * compute `include_deleted if principal.internal else False`; keeping that in a
 * single function means a new resource cannot forget it, and there is exactly
 * one place to read to know what the rule is.
 */

import { AppHttpError } from '@/http/errors'

/**
 * Honour `include_deleted` only for an internal caller.
 *
 * Everything else reads live rows, whatever the query string said. Forcing
 * `false` rather than raising matches the Python: the request is answerable, so
 * it is answered — with the rows the caller is allowed to see.
 */
export function resolveIncludeDeleted(
  requested: boolean,
  isInternal: boolean
): boolean {
  return isInternal ? requested : false
}

/** `<object>/not-found`, 404. The code is a client-facing contract. */
export function notFound(object: string, message: string): AppHttpError {
  return new AppHttpError({
    code: `${object}/not-found`,
    message,
    httpStatus: 404,
  })
}

export function noFieldsToUpdate(): AppHttpError {
  return new AppHttpError({
    code: 'provider/invalid-request',
    message: 'No fields to update.',
    httpStatus: 400,
  })
}

/**
 * Drop the keys the caller did not send, so a PATCH never nulls a field by
 * omission.
 *
 * `undefined` means absent; an explicit `null` is kept, because clearing a
 * nullable column is a real instruction.
 */
export function sentFields<T extends object>(
  body: T,
  omit: string[] = []
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(
      ([key, value]) => value !== undefined && !omit.includes(key)
    )
  )
}
