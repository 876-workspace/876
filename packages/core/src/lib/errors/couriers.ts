import { HttpStatus, type ErrorDef } from '../../types/errors'

/** Canonical cross-package errors for 876 Couriers. */
export const COURIERS_ERRORS = {
  'branch/not-found': {
    message: 'Branch not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'customer/not-found': {
    message: 'Customer not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'mailbox/not-found': {
    message: 'Mailbox not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'package-category/inactive': {
    message: 'That package category is inactive.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'package-category/not-found': {
    message: 'Package category not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'package-category/provisioning-key-conflict': {
    message: 'That provisioned package category already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'package-category/slug-conflict': {
    message: 'A package category with that slug already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'package/not-found': {
    message: 'Package not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<string, ErrorDef>

export type CouriersErrorCode = keyof typeof COURIERS_ERRORS
