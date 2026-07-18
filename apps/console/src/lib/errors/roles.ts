import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const ROLE_ERRORS = {
  'role/not-found': {
    message: 'The requested role was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'role/create-failed': {
    message: 'Failed to create the role.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'role/duplicate-name': {
    message: 'A role with that name already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'role/update-failed': {
    message: 'Failed to update the role.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'role/delete-failed': {
    message: 'Failed to delete the role.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'role/system-protected': {
    message: 'System roles cannot be modified or deleted.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'role/has-members': {
    message: 'Reassign all members from this role before deleting it.',
    httpStatus: HttpStatus.CONFLICT,
  },
} as const satisfies Record<string, ErrorDef>

export type RoleErrorCode = keyof typeof ROLE_ERRORS
