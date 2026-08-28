import { HttpStatus, type ErrorDef } from '../../types/errors'

/**
 * Canonical CRM error definitions.
 *
 * Public CRM code, message, and HTTP status values are defined here once and
 * consumed by the API, SDKs, Console, CRM, and shared UI. Call sites may attach
 * permitted structured context, but must not replace these public messages.
 */
export const CRM_ERRORS = {
  'crm/category-in-use': {
    message: 'Category is in use by a live request.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/category-not-found': {
    message: 'Request category not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/category-slug-taken': {
    message: 'That category slug is already in use.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/customer-not-found': {
    message: 'Customer not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/description-note-immutable': {
    message: 'A request’s opening note cannot be deleted.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/form-in-use': {
    message: 'Request form has submissions and cannot be hard deleted.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/form-invalid-definition': {
    message: 'This request form definition is no longer valid.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/form-invalid-submission': {
    message: 'The request form submission is invalid.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'crm/form-not-found': {
    message: 'Request form not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/form-not-published': {
    message: 'This request form is not accepting submissions.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/form-slug-taken': {
    message: 'That request form slug is already in use.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/internal': {
    message: 'Internal server error.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'crm/invalid-request': {
    message: 'Invalid request.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'crm/invalid-response': {
    message: 'CRM API returned an invalid response.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'crm/not-configured': {
    message: 'CRM client is not configured.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'crm/not-found': {
    message: 'Not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/priority-default-required': {
    message: 'Choose another default priority before changing this one.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/priority-in-use': {
    message: 'Priority is in use and must be archived instead.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/priority-not-found': {
    message: 'Request priority not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/provisioning-invalid': {
    message: 'CRM provisioning configuration contains an invalid reference.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'crm/registry-unavailable': {
    message: 'The customer registry could not be reached.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'crm/reminder-not-found': {
    message: 'Request reminder not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/request-not-found': {
    message: 'Request not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/request-note-not-found': {
    message: 'Request note not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/subcategory-category-mismatch': {
    message: 'The subcategory does not belong to this category.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'crm/subcategory-in-use': {
    message: 'Subcategory is in use by a live request.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/subcategory-not-found': {
    message: 'Request subcategory not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/subcategory-slug-taken': {
    message: 'That subcategory slug is already in use.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/task-not-found': {
    message: 'Request task not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/team-in-use': {
    message: 'Team is in use.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/team-not-found': {
    message: 'Team not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'crm/team-slug-taken': {
    message: 'That team slug is already in use.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/tenant-inactive': {
    message: 'This organization’s CRM workspace is not active.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'crm/tenant-not-found': {
    message: 'This organization has no CRM workspace yet.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<string, ErrorDef>

export type CrmErrorCode = keyof typeof CRM_ERRORS
