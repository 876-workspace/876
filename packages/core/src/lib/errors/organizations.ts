import type { OrganizationErrorCode } from '../../types/organizations-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

export const ORGANIZATION_ERRORS = {
  'organization/duplicate-slug': {
    message: 'An organization with this slug already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'organization/duplicate-workos-id': {
    message: 'An organization with this WorkOS identifier already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'organization/has-members': {
    message: 'This organization still has active members.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'organization/internal-error': {
    message: 'An unexpected error occurred while processing the organization.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'organization/not-found': {
    message: 'No organization exists with the provided identifier.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'organization/validation-failed': {
    message: 'Please check the organization input and try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<OrganizationErrorCode, ErrorDef>
