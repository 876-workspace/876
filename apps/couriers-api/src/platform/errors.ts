export class AppHttpError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(options: {
    code: string
    message: string
    httpStatus?: number
    cause?: unknown
  }) {
    super(options.message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AppHttpError'
    this.code = options.code
    this.message = options.message
    this.httpStatus = options.httpStatus ?? 500
  }

  toClientError(): Record<string, unknown> {
    return { code: this.code, message: this.message }
  }
}

export function isAppHttpError(value: unknown): value is AppHttpError {
  return value instanceof AppHttpError
}
