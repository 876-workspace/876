import { AccountingProviderError } from '../errors'

/**
 * Zoho Books' flavour of the provider-layer error. It adds no state of its own;
 * the subclass exists so a caller can tell which adapter produced the failure.
 */
export class ZohoBooksError extends AccountingProviderError {
  constructor(options: {
    code: string
    message?: string
    httpStatus?: number | null
    retryable?: boolean
    cause?: unknown
  }) {
    super(options)
    this.name = 'ZohoBooksError'
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

/**
 * Maps a Zoho HTTP failure onto Billing's registered error contract.
 *
 * The provider's own code and message are accepted and then deliberately
 * discarded: raw provider text must never reach a client-safe message. Keeping
 * them in the signature makes that discard explicit at every call site.
 */
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
