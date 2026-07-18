import type { RoleErrorCode } from '../../types/roles-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Role-related error codes. Keep this registry sorted by code.
 */
export const ROLE_ERRORS = {
  'role/duplicate-name': {
    message: 'A role with this name already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'role/in-use': {
    message: 'This role is currently assigned to one or more members.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'role/last-owner': {
    message: 'Cannot remove the last owner role from the organization.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'role/not-found': {
    message: 'Role not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'role/owner-required': {
    message: 'This action requires an owner role.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'role/system-immutable': {
    message: 'System roles cannot be modified.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'role/unknown-permission': {
    message: 'One or more permissions are not recognized.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<RoleErrorCode, ErrorDef>
