import { getError, isErrorCode } from '@876/core'

type AppHttpErrorOptions = {
  code: string
  message: string
  httpStatus?: number
  cause?: unknown
}

type AppErrorOverrides = Omit<AppHttpErrorOptions, 'code' | 'message'> & {
  message?: string
}

export class AppHttpError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(options: AppHttpErrorOptions) {
    const registered = isErrorCode(options.code) ? getError(options.code) : null
    const message = options.message || registered?.message || 'Internal error.'

    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AppHttpError'
    this.code = registered?.code ?? options.code
    this.message = message
    this.httpStatus = registered?.httpStatus ?? options.httpStatus ?? 500
  }

  toClientError(): Record<string, unknown> {
    return { code: this.code, message: this.message }
  }
}

/**
 * Creates an HTTP error through the shared error registry when the code is
 * registered. Couriers-specific codes retain their explicit definition until
 * they are added to a Couriers registry.
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
      cause: options.cause,
    })
  }

  return new AppHttpError({
    code,
    message: options.message ?? 'Internal error.',
    httpStatus: options.httpStatus ?? 500,
    cause: options.cause,
  })
}

export function isAppHttpError(value: unknown): value is AppHttpError {
  return value instanceof AppHttpError
}
