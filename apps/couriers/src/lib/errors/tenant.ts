import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const TENANT_ERRORS = {
  'tenant/not-found': {
    message: 'The requested tenant was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'tenant/subdomain-taken': {
    message: 'That subdomain is already taken. Please choose another.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'tenant/create-failed': {
    message: 'Failed to create tenant.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'tenant/invalid-prefix': {
    message: 'Prefix may only contain letters and numbers.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
} as const satisfies Record<string, ErrorDef>

export type TenantErrorCode = keyof typeof TENANT_ERRORS
