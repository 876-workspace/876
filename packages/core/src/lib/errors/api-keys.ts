import type { ApiKeyErrorCode } from '../../types/api-keys-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * API key-related error codes. Keep this registry sorted by code.
 */
export const API_KEY_ERRORS = {
  'api-key/duplicate': {
    message: 'An API key with this identifier already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'api-key/expired': {
    message: 'This API key has expired. Please generate a new key.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'api-key/internal-error': {
    message: 'An unexpected error occurred while processing the API key.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'api-key/invalid': {
    message: 'The API key provided is invalid.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'api-key/missing': {
    message: 'An API key is required.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'api-key/not-found': {
    message: 'No API key exists with the provided identifier.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'api-key/revoked': {
    message: 'This API key has been revoked. Please generate a new key.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'api-key/validation-failed': {
    message: 'Please check the API key input and try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<ApiKeyErrorCode, ErrorDef>
