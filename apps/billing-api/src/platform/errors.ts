export class AppHttpError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly details?: unknown

  constructor(options: {
    code: string
    message: string
    httpStatus?: number
    details?: unknown
    cause?: unknown
  }) {
    super(options.message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AppHttpError'
    this.code = options.code
    this.httpStatus = options.httpStatus ?? 500
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

export function isAppHttpError(value: unknown): value is AppHttpError {
  return value instanceof AppHttpError
}
