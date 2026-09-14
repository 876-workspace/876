import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/** Tenant resource errors shared by tenant-owning service APIs. */
export const TENANT_ERRORS = {
  'tenant/conflict': {
    message: 'The tenant conflicts with an existing workspace.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'tenant/not-found': {
    message: 'The requested tenant was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<string, ErrorDef>
