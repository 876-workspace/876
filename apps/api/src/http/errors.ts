/**
 * The application error type.
 *
 * Errors are thrown, never returned. Express 5 propagates a rejection from an
 * async handler to the error middleware natively, so a handler throws and the
 * middleware owns the response shape — no try/catch + next(err) boilerplate.
 *
 * `httpStatus` is server-only. The error middleware uses it as the HTTP status
 * and strips it from the body: a client-facing error carries `code` and
 * `message` only (.claude/rules/stripe-api-pattern.md).
 */
export class AppHttpError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly description?: string
  readonly param?: string
  /** Extra fields merged into the error body — used by OAuth, which has its own spec-defined shape. */
  readonly extra?: Record<string, unknown>

  constructor(options: {
    code: string
    message: string
    httpStatus?: number
    description?: string
    param?: string
    extra?: Record<string, unknown>
    cause?: unknown
  }) {
    super(options.message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AppHttpError'
    this.code = options.code
    this.message = options.message
    this.httpStatus = options.httpStatus ?? 500
    if (options.description !== undefined)
      this.description = options.description
    if (options.param !== undefined) this.param = options.param
    if (options.extra !== undefined) this.extra = options.extra
  }

  /** The client-safe body. Never includes the HTTP status or the cause. */
  toClientError(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.description !== undefined
        ? { description: this.description }
        : {}),
      ...(this.param !== undefined ? { param: this.param } : {}),
      ...(this.extra ?? {}),
    }
  }
}

export function isAppHttpError(value: unknown): value is AppHttpError {
  return value instanceof AppHttpError
}

/**
 * Constructors for the errors raised from more than one module.
 *
 * Codes are part of the contract — clients branch on them — so these strings
 * match the FastAPI service exactly and renaming one is a breaking change.
 */
export const errors = {
  noSession: () =>
    new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    }),

  forbidden: (message = 'Forbidden.') =>
    new AppHttpError({ code: 'auth/forbidden', message, httpStatus: 403 }),

  wrongRealm: () =>
    new AppHttpError({
      code: 'auth/wrong-realm',
      message: 'This account cannot access this resource.',
      httpStatus: 403,
    }),

  invalidToken: (message = 'The bearer token is invalid or expired.') =>
    new AppHttpError({ code: 'auth/invalid-token', message, httpStatus: 401 }),

  notFound: (resource: string) =>
    new AppHttpError({
      code: `${resource}/not-found`,
      message: 'Not found.',
      httpStatus: 404,
    }),

  validation: (message: string, param?: string) =>
    new AppHttpError({
      code: 'request/invalid',
      message,
      httpStatus: 422,
      ...(param ? { param } : {}),
    }),

  conflict: (code: string, message: string) =>
    new AppHttpError({ code, message, httpStatus: 409 }),

  rateLimited: (message = 'Too many requests. Try again later.') =>
    new AppHttpError({ code: 'rate-limit/exceeded', message, httpStatus: 429 }),

  internal: (message = 'Internal error.') =>
    new AppHttpError({ code: 'auth/internal-error', message, httpStatus: 500 }),

  apiKeyMissing: () =>
    new AppHttpError({
      code: 'api-key/missing',
      message: 'An API key is required.',
      httpStatus: 401,
    }),

  apiKeyInvalid: () =>
    new AppHttpError({
      code: 'api-key/invalid',
      message: 'Invalid API key.',
      httpStatus: 401,
    }),

  apiKeyRevoked: () =>
    new AppHttpError({
      code: 'api-key/revoked',
      message: 'API key has been revoked.',
      httpStatus: 401,
    }),

  apiKeyExpired: () =>
    new AppHttpError({
      code: 'api-key/expired',
      message: 'API key has expired.',
      httpStatus: 401,
    }),
} as const
