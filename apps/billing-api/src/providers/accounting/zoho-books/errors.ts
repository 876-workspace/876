import { getError, isErrorCode } from '@876/core'

export class ZohoBooksError extends Error {
  readonly code: string
  readonly httpStatus: number | null
  readonly retryable: boolean

  constructor(options: {
    code: string
    message?: string
    httpStatus?: number | null
    retryable?: boolean
    cause?: unknown
  }) {
    const registered = isErrorCode(options.code) ? getError(options.code) : null
    super(
      options.message ?? registered?.message ?? 'An accounting provider error occurred.',
      options.cause === undefined ? undefined : { cause: options.cause }
    )
    this.name = 'ZohoBooksError'
    this.code = registered?.code ?? options.code
    this.httpStatus = options.httpStatus ?? registered?.httpStatus ?? null
    this.retryable = options.retryable ?? false
  }
}

export function toZohoBooksError(error: unknown): ZohoBooksError {
  if (error instanceof ZohoBooksError) return error
  return new ZohoBooksError({
    code: 'billing/provider-unavailable',
    retryable: true,
    cause: error,
  })
}

export function classifyZohoHttpError(
  status: number,
  _providerCode: string,
  _providerMessage: string
): ZohoBooksError {
  if (status === 401 || status === 403)
    return new ZohoBooksError({
      code: 'billing/provider-authorization-required',
      httpStatus: status,
      retryable: false,
    })
  if (status === 404)
    return new ZohoBooksError({
      code: 'billing/provider-resource-not-found',
      httpStatus: status,
      retryable: false,
    })
  if (status === 429)
    return new ZohoBooksError({
      code: 'billing/provider-rate-limited',
      httpStatus: status,
      retryable: true,
    })
  if (status >= 500)
    return new ZohoBooksError({
      code: 'billing/provider-unavailable',
      httpStatus: status,
      retryable: true,
    })
  return new ZohoBooksError({
    code: 'billing/provider-invalid-request',
    httpStatus: status,
    retryable: false,
  })
}
