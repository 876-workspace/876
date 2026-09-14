import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/** Integration-key transport errors shared by service-to-service APIs. */
export const INTEGRATION_KEY_ERRORS = {
  'integration-key/invalid': {
    message: 'The integration key provided is invalid.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'integration-key/missing': {
    message: 'An integration key is required.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
} as const satisfies Record<string, ErrorDef>
