import type { AppError, Error, ErrorDef } from '../../types/errors'

import { ACCOUNT_ERRORS } from './accounts'
import { ADDRESS_ERRORS } from './addresses'
import { API_KEY_ERRORS } from './api-keys'
import { APP_ACCESS_ERRORS } from './app-access'
import { APP_ASSIGNMENT_ERRORS } from './app-assignments'
import { APP_ERRORS } from './apps'
import { AUTH_ERRORS } from './auth'
import { CONTACT_ERRORS } from './contacts'
import { CRM_ERRORS } from './crm'
import { DEPARTMENT_ERRORS } from './departments'
import { EMPLOYEE_ERRORS } from './employees'
import { FEATURE_ERRORS } from './features'
import { INVITE_ERRORS } from './invites'
import { LOCATION_ERRORS } from './locations'
import { MEMBERSHIP_ERRORS } from './memberships'
import { OAUTH_GRANT_ERRORS } from './oauth-grants'
import { ORGANIZATION_ERRORS } from './organizations'
import { PRODUCT_ERRORS } from './products'
import { PROFILE_ERRORS } from './profiles'
import { PROVIDER_ERRORS } from './provider'
import { RESERVED_USERNAME_ERRORS } from './reserved-usernames'
import { ROLE_ERRORS } from './roles'
import { SESSION_ERRORS } from './sessions'
import { SUBSCRIPTION_ERRORS } from './subscriptions'
import { USER_FEATURE_ERRORS } from './user-features'
import { USER_ERRORS } from './users'
import { WORK_ERRORS } from './work'

export const ERRORS = {
  ...ACCOUNT_ERRORS,
  ...ADDRESS_ERRORS,
  ...API_KEY_ERRORS,
  ...APP_ACCESS_ERRORS,
  ...APP_ASSIGNMENT_ERRORS,
  ...APP_ERRORS,
  ...AUTH_ERRORS,
  ...CONTACT_ERRORS,
  ...CRM_ERRORS,
  ...DEPARTMENT_ERRORS,
  ...EMPLOYEE_ERRORS,
  ...FEATURE_ERRORS,
  ...INVITE_ERRORS,
  ...LOCATION_ERRORS,
  ...MEMBERSHIP_ERRORS,
  ...OAUTH_GRANT_ERRORS,
  ...ORGANIZATION_ERRORS,
  ...PRODUCT_ERRORS,
  ...PROFILE_ERRORS,
  ...PROVIDER_ERRORS,
  ...RESERVED_USERNAME_ERRORS,
  ...ROLE_ERRORS,
  ...SESSION_ERRORS,
  ...SUBSCRIPTION_ERRORS,
  ...USER_ERRORS,
  ...USER_FEATURE_ERRORS,
  ...WORK_ERRORS,
} as const satisfies Record<string, ErrorDef>

type ErrorCode = keyof typeof ERRORS

type ErrorOptions = {
  param?: string
}

/** Creates an application error object for the given error code. */
export function getError<Code extends ErrorCode>(
  code: Code,
  options?: ErrorOptions
): Error<Code>
export function getError(code: string, options?: ErrorOptions): Error<ErrorCode>
export function getError(
  code: string,
  options?: ErrorOptions
): Error<ErrorCode> {
  const errorCode = isErrorCode(code) ? code : getFallbackErrorCode(code)
  const definition = ERRORS[errorCode]
  const error: Error<ErrorCode> = {
    code: errorCode,
    message: definition.message,
    httpStatus: definition.httpStatus,
  }

  if ('description' in definition && typeof definition.description === 'string')
    error.description = definition.description
  if (options?.param) error.param = options.param

  return error
}

/** Checks whether the given string is a registered error code. */
export function isErrorCode(code: string): code is ErrorCode {
  return Object.hasOwn(ERRORS, code)
}

/** Converts a server-side error into a client-safe app error. */
export function toAppError<Code extends string>(
  error: Error<Code>
): AppError<Code> {
  return {
    code: error.code,
    message: error.message,
  }
}

/** Type guard that checks whether a service result is an app error. */
export function isError<Code extends string>(
  result: unknown
): result is Error<Code> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'code' in result &&
    typeof (result as Record<string, unknown>).code === 'string' &&
    'message' in result &&
    typeof (result as Record<string, unknown>).message === 'string' &&
    'httpStatus' in result &&
    typeof (result as Record<string, unknown>).httpStatus === 'number'
  )
}

function getFallbackErrorCode(code: string): ErrorCode {
  if (
    code.startsWith('app-access/') ||
    code.startsWith('app-membership/') ||
    code.startsWith('app-permission/') ||
    code.startsWith('app-role/')
  )
    return 'app-access/internal-error'
  if (code.startsWith('account/')) return 'account/internal-error'
  if (code.startsWith('user/')) return 'user/internal-error'
  if (code.startsWith('api-key/')) return 'api-key/internal-error'
  if (code.startsWith('membership/')) return 'membership/internal-error'
  if (code.startsWith('organization/')) return 'organization/internal-error'
  if (code.startsWith('provider/')) return 'provider/internal-error'
  if (code.startsWith('feature/')) return 'feature/internal-error'
  if (code.startsWith('crm/')) return 'crm/internal'
  if (code.startsWith('work/')) return 'work/internal'

  return 'auth/unknown-error'
}
