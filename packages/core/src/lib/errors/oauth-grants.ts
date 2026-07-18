import type { OAuthGrantErrorCode } from '../../types/oauth-grants-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * OAuth grant-related error codes. Keep this registry sorted by code.
 */
export const OAUTH_GRANT_ERRORS = {
  'oauth-grant/not-found': {
    message: 'OAuth grant not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<OAuthGrantErrorCode, ErrorDef>
