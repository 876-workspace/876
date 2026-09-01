export class ZohoBooksError extends Error {
  readonly code: string
  readonly httpStatus: number | null
  readonly retryable: boolean

  constructor(options: {
    code: string
    message: string
    httpStatus?: number | null
    retryable?: boolean
    cause?: unknown
  }) {
    super(
      options.message,
      options.cause === undefined ? undefined : { cause: options.cause }
    )
    this.name = 'ZohoBooksError'
    this.code = options.code
    this.httpStatus = options.httpStatus ?? null
    this.retryable = options.retryable ?? false
  }
}

export function toZohoBooksError(error: unknown): ZohoBooksError {
  if (error instanceof ZohoBooksError) return error
  return new ZohoBooksError({
    code: 'billing/provider-unavailable',
    message: 'Zoho Books could not be reached.',
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
      message: 'Zoho Books authorization must be renewed.',
      httpStatus: status,
      retryable: false,
    })
  if (status === 404)
    return new ZohoBooksError({
      code: 'billing/provider-resource-not-found',
      message: 'The mapped Zoho Books resource was not found.',
      httpStatus: status,
      retryable: false,
    })
  if (status === 429)
    return new ZohoBooksError({
      code: 'billing/provider-rate-limited',
      message: 'Zoho Books rate limited the request.',
      httpStatus: status,
      retryable: true,
    })
  if (status >= 500)
    return new ZohoBooksError({
      code: 'billing/provider-unavailable',
      message: 'Zoho Books is temporarily unavailable.',
      httpStatus: status,
      retryable: true,
    })
  return new ZohoBooksError({
    code: 'billing/provider-invalid-request',
    message: 'Zoho Books rejected the request.',
    httpStatus: status,
    retryable: false,
  })
}
