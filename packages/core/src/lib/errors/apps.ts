import type { AppErrorCode } from '../../types/apps-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * App-related error codes. Keep this registry sorted by code.
 */
export const APP_ERRORS = {
  'app/not-found': {
    message: 'App not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<AppErrorCode, ErrorDef>
