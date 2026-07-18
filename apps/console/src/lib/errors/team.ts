import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const TEAM_ERRORS = {
  'team/not-found': {
    message: 'The requested Console member was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'team/create-failed': {
    message: 'Failed to add the Console member.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'team/already-exists': {
    message: 'This user already has a Console access grant.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'team/update-failed': {
    message: 'Failed to update the Console member.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'team/delete-failed': {
    message: 'Failed to remove the Console member.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'team/role-invalid': {
    message: 'The requested role is not a valid assignable role.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'team/role-forbidden': {
    message: 'You do not have permission to assign this role.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'team/target-protected': {
    message: 'Only a super admin can change the role of this Console member.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
} as const satisfies Record<string, ErrorDef>

export type TeamErrorCode = keyof typeof TEAM_ERRORS
