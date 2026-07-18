import type { LocationErrorCode } from '../../types/locations-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Location-related error codes. Keep this registry sorted by code.
 */
export const LOCATION_ERRORS = {
  'location/not-found': {
    message: 'Location not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'location/not-in-organization': {
    message: 'Location does not belong to this organization.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
} as const satisfies Record<LocationErrorCode, ErrorDef>
