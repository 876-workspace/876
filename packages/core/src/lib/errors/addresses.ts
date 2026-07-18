import type { AddressErrorCode } from '../../types/addresses-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Address-related error codes. Keep this registry sorted by code.
 */
export const ADDRESS_ERRORS = {
  'address/not-found': {
    message: 'Address not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<AddressErrorCode, ErrorDef>
