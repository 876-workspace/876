import { getError, isErrorCode } from '@876/core'

/**
 * The application error type.
 *
 * Errors are thrown, never returned. Express 5 propagates a rejection from an
 * async handler to the error middleware natively, so a handler throws and the
 * middleware owns the response shape — no try/catch + next(err) boilerplate.
 *
 * This type lives in `platform/` rather than `http/` for the same reason
 * `core/errors.py` sits beside the other primitives in the Python service: a
 * leaf layer — a provider adapter, a phone normalizer — has to be able to raise
 * a contract-carrying error without importing the HTTP stack, which
 * `platform-is-leaf` and `providers-are-leaf` forbid outright.
 *
 * `http/errors.ts` re-exports it, so every existing import keeps working and
 * `@/http/errors` remains the natural import for anything already in `http/`
 * or a module.
 *
 * `httpStatus` is server-only. The error middleware uses it as the HTTP status
 * and strips it from the body: a client-facing error carries `code` and
 * `message` only (.claude/rules/stripe-api-pattern.md).
 */
type AppHttpErrorOptions = {
  code: string
  message: string
  httpStatus?: number
  description?: string
  param?: string
  extra?: Record<string, unknown>
  cause?: unknown
}

type AppErrorOverrides = Omit<AppHttpErrorOptions, 'code' | 'message'> & {
  message?: string
}

export class AppHttpError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly description?: string
  readonly param?: string
  /** Extra fields merged into the error body — used by OAuth, which has its own spec-defined shape. */
  readonly extra?: Record<string, unknown>

  constructor(options: AppHttpErrorOptions) {
    const registered = isErrorCode(options.code)
      ? getError(options.code, { param: options.param })
      : null
    const message = options.message || registered?.message || 'Internal error.'

    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AppHttpError'
    this.code = registered?.code ?? options.code
    this.message = message
    this.httpStatus = registered?.httpStatus ?? options.httpStatus ?? 500

    const description = options.description ?? registered?.description
    const param = options.param ?? registered?.param
    if (description !== undefined) this.description = description
    if (param !== undefined) this.param = param
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

/**
 * Creates an HTTP error through the shared error registry when the code is
 * registered. Unregistered service-local codes retain their explicit legacy
 * definition until they are promoted into a registry.
 */
export function appError(
  code: string,
  options: AppErrorOverrides = {}
): AppHttpError {
  if (isErrorCode(code)) {
    const registered = getError(code, { param: options.param })
    return new AppHttpError({
      code: registered.code,
      message: options.message ?? registered.message,
      httpStatus: registered.httpStatus,
      description: options.description ?? registered.description,
      param: options.param ?? registered.param,
      extra: options.extra,
      cause: options.cause,
    })
  }

  return new AppHttpError({
    code,
    message: options.message ?? 'Internal error.',
    httpStatus: options.httpStatus ?? 500,
    description: options.description,
    param: options.param,
    extra: options.extra,
    cause: options.cause,
  })
}

export function isAppHttpError(value: unknown): value is AppHttpError {
  return value instanceof AppHttpError
}
