import { HttpStatus, type HttpStatusCode } from '@876/core'
import type { Response } from 'express'

/**
 * Canonical Commerce error definitions.
 *
 * Public code, message, and HTTP status values are defined here once.
 * Call sites resolve through `getError`/`sendCommerceError` and must not
 * restate the public message or status.
 */
export const COMMERCE_ERRORS = {
  'commerce/internal-error': {
    message: 'An unexpected error occurred.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'commerce/invalid-request': {
    message: 'The commerce request could not be processed.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'commerce/not-found': {
    message: 'The requested commerce resource was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<
  string,
  { message: string; httpStatus: HttpStatusCode }
>

export type CommerceErrorCode = keyof typeof COMMERCE_ERRORS

export type CommerceError = {
  code: CommerceErrorCode
  message: string
  httpStatus: HttpStatusCode
  param?: string
}

export function getCommerceError(
  code: CommerceErrorCode,
  options?: { param?: string }
): CommerceError {
  const definition = COMMERCE_ERRORS[code]
  return {
    code,
    message: definition.message,
    httpStatus: definition.httpStatus,
    ...(options?.param ? { param: options.param } : {}),
  }
}

export function toCommerceClientError(error: CommerceError) {
  return {
    code: error.code,
    message: error.message,
  }
}

/** Sends a registered application error without duplicating code/message/status. */
export function sendCommerceError(res: Response, code: CommerceErrorCode) {
  const error = getCommerceError(code)
  return res.status(error.httpStatus).json({
    data: null,
    error: toCommerceClientError(error),
  })
}
