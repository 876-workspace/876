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
  // The canonical `{ data, error }` envelope. The browser client validates the
  // envelope before it reads the error, so a body carrying only `error`
  // surfaces to the user as client/invalid-response rather than as the denial
  // or failure that actually occurred.
  return Response.json(
    { data: null, error: getAppError(code) },
    { status: httpStatus }
  )
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
 * Registered codes are always normalized through the local registry so a
 * thrown object's message cannot bypass the canonical client-safe message.
 */
export function extractAppError(
  err: unknown,
  defaultCode = 'error/unknown'
): AppError {
  if (isAppError(err)) return getAppError(err.code)
  if (err instanceof Error) return getAppError(defaultCode)

  if (
    typeof err === 'object' &&
    err !== null &&
    'error' in err &&
    isAppError((err as Record<string, unknown>).error)
  ) {
    return getAppError((err as { error: AppError }).error.code)
  }

  return getAppError(defaultCode)
}

/** Handle an unknown API error: logs it, returns an appropriate Response. */
export function handleApiError(err: unknown): Response {
  console.error(err)

  if (isAppError(err)) return errorResponse(err.code)

  if (typeof err === 'object' && err !== null && 'issues' in err)
    return errorResponse('error/validation-failed')

  return errorResponse('error/unknown')
}
