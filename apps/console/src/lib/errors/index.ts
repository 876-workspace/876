import type { AppError, ErrorDef, HttpStatusCode } from '@876/core'
import { HttpStatus } from '@876/core'

import { GENERIC_ERRORS } from './generic'
import { ROLE_ERRORS } from './roles'
import { TEAM_ERRORS } from './team'
import { USER_ERRORS } from './users'

export { GENERIC_ERRORS } from './generic'
export type { GenericErrorCode } from './generic'
export { ROLE_ERRORS } from './roles'
export type { RoleErrorCode } from './roles'
export { TEAM_ERRORS } from './team'
export type { TeamErrorCode } from './team'
export { USER_ERRORS } from './users'
export type { UserErrorCode } from './users'

export const CONSOLE_ERRORS = {
  ...GENERIC_ERRORS,
  ...ROLE_ERRORS,
  ...TEAM_ERRORS,
  ...USER_ERRORS,
} as const satisfies Record<string, ErrorDef>

export type ConsoleErrorCode = keyof typeof CONSOLE_ERRORS

const FALLBACK_CODE = 'error/unknown' satisfies ConsoleErrorCode

/** Look up a code in the registry; unknown codes fall back to error/unknown with the original code surfaced in the message. */
export function getError(code: string): {
  code: string
  message: string
  httpStatus: HttpStatusCode
} {
  if (Object.hasOwn(CONSOLE_ERRORS, code)) {
    const def = CONSOLE_ERRORS[code as ConsoleErrorCode]
    return { code, message: def.message, httpStatus: def.httpStatus }
  }
  const fallback = CONSOLE_ERRORS[FALLBACK_CODE]
  return {
    code,
    message: `An unexpected error occurred. (Code: ${code})`,
    httpStatus: fallback.httpStatus,
  }
}

/** Like getError but returns a client-safe AppError (no httpStatus). */
export function getAppError(code: string): AppError {
  const { code: c, message } = getError(code)
  return { code: c, message }
}

/** Build a Response with JSON body { error: AppError } and the registry HTTP status. */
export function errorResponse(code: string): Response {
  const { httpStatus } = getError(code)
  return Response.json({ error: getAppError(code) }, { status: httpStatus })
}

/** Type guard: checks that value is an AppError (object with string code and message). */
export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as Record<string, unknown>).code === 'string' &&
    'message' in value &&
    typeof (value as Record<string, unknown>).message === 'string'
  )
}

/**
 * Extract an AppError from an unknown thrown value.
 * Handles: AppError, Error instance, { error: AppError } envelope, anything else.
 */
export function extractAppError(
  err: unknown,
  defaultCode = 'error/unknown'
): AppError {
  if (isAppError(err)) return err
  if (err instanceof Error) {
    return {
      code: defaultCode,
      message: err.message || getError(defaultCode).message,
    }
  }
  if (
    typeof err === 'object' &&
    err !== null &&
    'error' in err &&
    isAppError((err as Record<string, unknown>).error)
  ) {
    return (err as { error: AppError }).error
  }
  return getAppError(defaultCode)
}

/** Handle an unknown API error: logs it, returns an appropriate Response. */
export function handleApiError(err: unknown): Response {
  console.error(err)

  if (isAppError(err)) {
    const { httpStatus } = getError(err.code)
    return Response.json({ error: err }, { status: httpStatus })
  }

  if (typeof err === 'object' && err !== null && 'issues' in err) {
    return Response.json(
      { error: getAppError('error/validation-failed') },
      { status: HttpStatus.UNPROCESSABLE_ENTITY }
    )
  }

  if (err instanceof Error) {
    return Response.json(
      {
        error: {
          code: 'error/unknown',
          message: err.message || getError('error/unknown').message,
        },
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    )
  }

  return errorResponse('error/unknown')
}
