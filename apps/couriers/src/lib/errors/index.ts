import type { ErrorDef, AppError, HttpStatusCode } from '@876/core'
import { HttpStatus } from '@876/core'

import { GENERIC_ERRORS } from './generic'
import { TENANT_ERRORS } from './tenant'
import { CUSTOMER_ERRORS } from './customer'

export const COURIERS_ERRORS = {
  ...GENERIC_ERRORS,
  ...TENANT_ERRORS,
  ...CUSTOMER_ERRORS,
} as const satisfies Record<string, ErrorDef>

export type CouriersErrorCode = keyof typeof COURIERS_ERRORS

/**
 * Retrieves the full error details (code, message, httpStatus) for a given error code.
 * If the error code is not found in the registry, it falls back to 'error/unknown'
 * with a message indicating the unknown code.
 */
export function getError(code: string): {
  code: string
  message: string
  httpStatus: HttpStatusCode
} {
  if (code in COURIERS_ERRORS) {
    const def = COURIERS_ERRORS[code as CouriersErrorCode]
    return {
      code,
      message: def.message,
      httpStatus: def.httpStatus,
    }
  }

  return {
    code: 'error/unknown',
    message: `An unexpected error occurred. (Code: ${code})`,
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  }
}

/**
 * Retrieves a client-safe AppError for a given error code.
 */
export function getAppError(code: string): AppError {
  const errDef = getError(code)
  return {
    code: errDef.code,
    message: errDef.message,
  }
}

/**
 * Creates a standard Response object with the AppError payload and correct HTTP status.
 */
export function errorResponse(code: string): Response {
  return Response.json(
    { error: getAppError(code) },
    { status: getError(code).httpStatus }
  )
}

/**
 * Checks if a value matches the AppError interface.
 */
export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.code === 'string' && typeof candidate.message === 'string'
  )
}

/**
 * Extracts an AppError from an unknown error value.
 */
export function extractAppError(
  err: unknown,
  defaultCode = 'error/unknown'
): AppError {
  if (isAppError(err)) {
    return err
  }

  if (typeof err === 'object' && err !== null && 'error' in err) {
    const nested = (err as Record<string, unknown>).error
    if (isAppError(nested)) {
      return nested
    }
  }

  if (err instanceof Error) {
    return {
      code: defaultCode,
      message: err.message,
    }
  }

  return getAppError(defaultCode)
}

/**
 * Handles API errors by logging them to console.error and returning a web Response.
 */
export function handleApiError(err: unknown): Response {
  console.error(err)

  if (isAppError(err)) {
    return Response.json(
      { error: err },
      { status: getError(err.code).httpStatus }
    )
  }

  if (typeof err === 'object' && err !== null && 'issues' in err) {
    return errorResponse('error/validation-failed')
  }

  if (err instanceof Error) {
    return Response.json(
      {
        error: {
          code: 'error/unknown',
          message: err.message,
        },
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    )
  }

  return errorResponse('error/unknown')
}
