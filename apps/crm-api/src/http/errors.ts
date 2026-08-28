/**
 * The CRM service's error registry.
 *
 * Expected failures are values with a stable, namespaced code and a real HTTP
 * status; only genuine bugs reach the handler as an unrecognized throw and
 * become a 500. Without this every "tenant not found" answered 500, which
 * tells a caller nothing and reads as an outage.
 */
const ERRORS = {
  'crm/category-in-use': {
    message: 'Category is in use by a live request.',
    httpStatus: 409,
  },
  'crm/category-not-found': {
    message: 'Request category not found.',
    httpStatus: 404,
  },
  'crm/category-slug-taken': {
    message: 'That category slug is already in use.',
    httpStatus: 409,
  },
  'crm/customer-not-found': {
    message: 'Customer not found.',
    httpStatus: 404,
  },
  'crm/description-note-immutable': {
    message: 'A request’s opening note cannot be deleted.',
    httpStatus: 409,
  },
  'crm/form-in-use': {
    message: 'Request form has submissions and cannot be hard deleted.',
    httpStatus: 409,
  },
  'crm/form-invalid-definition': {
    message: 'This request form definition is no longer valid.',
    httpStatus: 409,
  },
  'crm/form-invalid-submission': {
    message: 'The request form submission is invalid.',
    httpStatus: 422,
  },
  'crm/form-not-found': {
    message: 'Request form not found.',
    httpStatus: 404,
  },
  'crm/form-not-published': {
    message: 'This request form is not accepting submissions.',
    httpStatus: 409,
  },
  'crm/form-slug-taken': {
    message: 'That request form slug is already in use.',
    httpStatus: 409,
  },
  'crm/priority-default-required': {
    message: 'Choose another default priority before changing this one.',
    httpStatus: 409,
  },
  'crm/priority-in-use': {
    message: 'Priority is in use and must be archived instead.',
    httpStatus: 409,
  },
  'crm/priority-not-found': {
    message: 'Request priority not found.',
    httpStatus: 404,
  },
  'crm/registry-unavailable': {
    message: 'The customer registry could not be reached.',
    httpStatus: 502,
  },
  'crm/reminder-not-found': {
    message: 'Request reminder not found.',
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
  'crm/subcategory-category-mismatch': {
    message: 'The subcategory does not belong to this category.',
    httpStatus: 422,
  },
  'crm/subcategory-in-use': {
    message: 'Subcategory is in use by a live request.',
    httpStatus: 409,
  },
  'crm/subcategory-not-found': {
    message: 'Request subcategory not found.',
    httpStatus: 404,
  },
  'crm/subcategory-slug-taken': {
    message: 'That subcategory slug is already in use.',
    httpStatus: 409,
  },
  'crm/task-not-found': {
    message: 'Request task not found.',
    httpStatus: 404,
  },
  'crm/team-in-use': {
    message: 'Team is in use.',
    httpStatus: 409,
  },
  'crm/team-not-found': {
    message: 'Team not found.',
    httpStatus: 404,
  },
  'crm/team-slug-taken': {
    message: 'That team slug is already in use.',
    httpStatus: 409,
  },
  'crm/tenant-inactive': {
    message: 'This organization’s CRM workspace is not active.',
    httpStatus: 409,
  },
  'crm/tenant-not-found': {
    message: 'This organization has no CRM workspace yet.',
    httpStatus: 404,
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
