import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const ROLE_ERRORS = {
  'role/default-immutable': {
    message: 'Default roles cannot be edited or deleted.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'role/in-use': {
    message: 'Reassign all team members before deleting this role.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'role/invalid-permission': {
    message: 'One or more permission keys are invalid.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'role/name-taken': {
    message: 'A role with that name already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'role/not-found': {
    message: 'The requested role was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<string, ErrorDef>

export type RoleErrorCode = keyof typeof ROLE_ERRORS
