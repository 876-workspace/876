import 'server-only'

import { apiError, getError, isErrorCode, type AppError } from '@876/core'

/** Keeps Work service details out of Invoice's browser-facing API envelope. */
export function workErrorResponse(error: AppError): Response {
  const registered = isErrorCode(error.code)
    ? getError(error.code)
    : getError('work/invalid-response')

  return apiError(registered, { status: registered.httpStatus })
}
