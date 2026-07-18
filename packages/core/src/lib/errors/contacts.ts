import type { ContactErrorCode } from '../../types/contacts-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Contact-related error codes. Keep this registry sorted by code.
 */
export const CONTACT_ERRORS = {
  'contact/already-exists': {
    message: 'This contact already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'contact/not-found': {
    message: 'Contact not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'contact/self-contact': {
    message: 'A user cannot be their own contact.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'contact/user-not-member': {
    message: 'The linked user is not an active member of this organization.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<ContactErrorCode, ErrorDef>
