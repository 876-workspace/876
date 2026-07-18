import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const USER_ERRORS = {
  'user/not-found': {
    message: 'The requested user was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'user/create-failed': {
    message: 'Failed to create the user.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'user/update-failed': {
    message: 'Failed to update the user.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'user/delete-failed': {
    message: 'Failed to delete the user.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'user/org-create-failed': {
    message: 'User created but the organization could not be created.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'user/membership-failed': {
    message:
      'User and organization created but membership could not be established.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'user/role-change-forbidden': {
    message: 'You do not have permission to assign this role to the user.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
} as const satisfies Record<string, ErrorDef>

export type UserErrorCode = keyof typeof USER_ERRORS
