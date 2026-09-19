import { apiError } from '@876/core/api'
import { getError, toAppError, type HttpStatusCode } from '@876/core'

import { MAX_COLLECTION_NAME_LENGTH } from './records/collections/types'
import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH } from './records/notes/types'

/**
 * Canonical Widgets error definitions.
 *
 * Public code, message, and HTTP status values are defined here once.
 * Service call sites pass only the registered code; routes and auth
 * helpers resolve responses through this module. Call sites must not
 * restate the public message or status.
 */
export const WIDGETS_ERRORS = {
  'widgets/admin-required': {
    message: 'Widget administrator access is required.',
    httpStatus: 403 as HttpStatusCode,
  },
  'widgets/collection-name-taken': {
    message: 'A collection with this name already exists.',
    httpStatus: 409 as HttpStatusCode,
  },
  'widgets/collection-not-found': {
    message: 'Collection not found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'widgets/invalid-body': {
    message: `Notepad entries cannot exceed ${MAX_BODY_LENGTH} characters.`,
    httpStatus: 400 as HttpStatusCode,
  },
  'widgets/invalid-collection-name': {
    message: `Collection names must be between 1 and ${MAX_COLLECTION_NAME_LENGTH} characters.`,
    httpStatus: 400 as HttpStatusCode,
  },
  'widgets/invalid-color': {
    message: 'Invalid note color.',
    httpStatus: 400 as HttpStatusCode,
  },
  'widgets/invalid-title': {
    message: `Notepad titles must be between 1 and ${MAX_TITLE_LENGTH} characters.`,
    httpStatus: 400 as HttpStatusCode,
  },
  'widgets/missing-actor': {
    message: 'Missing actor identity.',
    httpStatus: 400 as HttpStatusCode,
  },
  'widgets/missing-owner': {
    message: 'Owner account is required.',
    httpStatus: 400 as HttpStatusCode,
  },
  'widgets/not-configured': {
    message: 'Widgets API is not configured.',
    httpStatus: 503 as HttpStatusCode,
  },
  'widgets/note-not-found': {
    message: 'Notepad entry not found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'widgets/unauthorized': {
    message: 'Unauthorized.',
    httpStatus: 401 as HttpStatusCode,
  },
} as const satisfies Record<
  string,
  { message: string; httpStatus: HttpStatusCode }
>

export type WidgetsErrorCode = keyof typeof WIDGETS_ERRORS

export type WidgetsError = {
  code: WidgetsErrorCode
  message: string
  httpStatus: HttpStatusCode
}

export function getWidgetsError(code: WidgetsErrorCode): WidgetsError {
  const definition = WIDGETS_ERRORS[code]
  return {
    code,
    message: definition.message,
    httpStatus: definition.httpStatus,
  }
}

export function toWidgetsClientError(error: WidgetsError) {
  return {
    code: error.code,
    message: error.message,
  }
}

/** Builds a registered auth-failure response without literal messages. */
export function widgetsErrorResponse(code: WidgetsErrorCode): Response {
  const error = getWidgetsError(code)
  return apiError(toWidgetsClientError(error), { status: error.httpStatus })
}

/** Shared malformed-JSON response from the core request/invalid-json definition. */
export function invalidJsonResponse(): Response {
  const invalid = getError('request/invalid-json')
  return Response.json(
    { data: null, error: toAppError(invalid) },
    { status: invalid.httpStatus }
  )
}
