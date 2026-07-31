import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const ADDRESS_ERRORS = {
  'address/not-found': {
    message: 'The requested address was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'address/in-use': {
    message:
      'This address is used by a branch, warehouse or customer. Remove it from those first.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'address/unknown-country': {
    message: 'Addresses are not supported in that country.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'address/region-required': {
    message: 'Select a region for that country.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'address/unknown-region': {
    message: 'That region does not belong to the selected country.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'address/geography-unavailable': {
    message: 'Country information could not be loaded. Try again shortly.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
} as const satisfies Record<string, ErrorDef>

export type AddressErrorCode = keyof typeof ADDRESS_ERRORS
