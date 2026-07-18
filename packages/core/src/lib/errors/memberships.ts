import type { MembershipErrorCode } from '../../types/memberships-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

export const MEMBERSHIP_ERRORS = {
  'membership/duplicate': {
    message: 'This user is already a member of the organization.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'membership/internal-error': {
    message: 'An unexpected error occurred while processing the membership.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'membership/not-found': {
    message: 'No membership exists with the provided identifier.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'membership/not-in-organization': {
    message: 'Membership does not belong to this organization.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'membership/user-not-enterprise': {
    message: 'Only enterprise users can belong to organizations.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'membership/validation-failed': {
    message: 'Please check the membership input and try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<MembershipErrorCode, ErrorDef>
