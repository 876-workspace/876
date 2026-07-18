import type { FeatureErrorCode } from '../../types/features-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

export const FEATURE_ERRORS = {
  'feature/duplicate': {
    message: 'A feature with this identifier already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'feature/internal-error': {
    message: 'An unexpected error occurred while processing the feature.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'feature/not-found': {
    message: 'No feature exists with the provided identifier.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'feature/org-not-found': {
    message: 'No organization exists with the provided identifier.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'feature/scope-mismatch': {
    message: 'This feature cannot be granted to the specified target type.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'feature/user-not-found': {
    message: 'No user exists with the provided identifier.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'feature/validation-failed': {
    message: 'Please check the feature input and try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'feature/workos-error': {
    message: 'WorkOS could not complete the feature operation.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
} as const satisfies Record<FeatureErrorCode, ErrorDef>
