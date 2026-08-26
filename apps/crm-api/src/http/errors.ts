/**
 * The CRM service's error registry.
 *
 * Expected failures are values with a stable, namespaced code and a real HTTP
 * status; only genuine bugs reach the handler as an unrecognized throw and
 * become a 500. Without this every "tenant not found" answered 500, which
 * tells a caller nothing and reads as an outage.
 */
const ERRORS = {
  'crm/tenant-not-found': {
    message: 'This organization has no CRM workspace yet.',
    httpStatus: 404,
  },
  'crm/tenant-inactive': {
    message: 'This organization’s CRM workspace is not active.',
    httpStatus: 409,
  },
  'crm/customer-not-found': {
    message: 'Customer not found.',
    httpStatus: 404,
  },
  'crm/request-not-found': {
    message: 'Request not found.',
    httpStatus: 404,
  },
  'crm/request-note-not-found': {
    message: 'Request note not found.',
    httpStatus: 404,
  },
  'crm/description-note-immutable': {
    message: 'A request’s opening note cannot be deleted.',
    httpStatus: 409,
  },
  'crm/registry-unavailable': {
    message: 'The customer registry could not be reached.',
    httpStatus: 502,
  },
} as const

export type CrmErrorCode = keyof typeof ERRORS

/** A failure that is part of the contract, carrying its own status and code. */
export class CrmHttpError extends Error {
  readonly code: CrmErrorCode
  readonly httpStatus: number

  constructor(code: CrmErrorCode, message?: string) {
    super(message ?? ERRORS[code].message)
    this.name = 'CrmHttpError'
    this.code = code
    this.httpStatus = ERRORS[code].httpStatus
  }
}

/**
 * Creates a registered error. The registry owns the message and status, so a
 * call site cannot quietly disagree with the contract.
 */
export function crmError(code: CrmErrorCode, message?: string): CrmHttpError {
  return new CrmHttpError(code, message)
}
