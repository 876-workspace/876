import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const LOCATION_ERRORS = {
  'branch/invalid': {
    message: 'Invalid branch.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'branch/conflict': {
    message: 'The branch conflicts with an existing location.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'branch/not-found': {
    message: 'The requested branch was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'warehouse/invalid': {
    message: 'Invalid warehouse.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'warehouse/conflict': {
    message: 'The warehouse conflicts with an existing location.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'warehouse/not-found': {
    message: 'The requested warehouse was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'location/duplicate-code': {
    message: 'A location with that code already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'platform/unavailable': {
    message: 'The platform service is temporarily unavailable.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
} as const satisfies Record<string, ErrorDef>

export type LocationErrorCode = keyof typeof LOCATION_ERRORS
