import { getError, isErrorCode } from '@876/core'

type AppHttpErrorOptions = {
  code: string
  message: string
  httpStatus?: number
  details?: unknown
  cause?: unknown
}

type AppErrorOverrides = Omit<AppHttpErrorOptions, 'code' | 'message'> & {
  message?: string
}

export class AppHttpError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly details?: unknown

  constructor(options: AppHttpErrorOptions) {
    const registered = isErrorCode(options.code) ? getError(options.code) : null
    const message = options.message || registered?.message || 'Internal error.'

    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AppHttpError'
    this.code = registered?.code ?? options.code
    this.message = message
    this.httpStatus = registered?.httpStatus ?? options.httpStatus ?? 500
    if (options.details !== undefined) this.details = options.details
  }

  toClientError(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    }
  }
}

/**
 * Creates an HTTP error through the shared error registry when the code is
 * registered. Billing-specific codes retain their explicit definition until
 * they are added to a Billing registry.
 */
export function appError(
  code: string,
  options: AppErrorOverrides = {}
): AppHttpError {
  if (isErrorCode(code)) {
    const registered = getError(code)
    return new AppHttpError({
      code: registered.code,
      message: options.message ?? registered.message,
      httpStatus: registered.httpStatus,
      details: options.details,
      cause: options.cause,
    })
  }

  return new AppHttpError({
    code,
    message: options.message ?? 'Internal error.',
    httpStatus: options.httpStatus ?? 500,
    details: options.details,
    cause: options.cause,
  })
}

export function isAppHttpError(value: unknown): value is AppHttpError {
  return value instanceof AppHttpError
}
