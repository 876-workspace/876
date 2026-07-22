import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const TEAM_ERRORS = {
  'team/already-member': {
    message: 'This user is already a team member.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'team/last-active-admin': {
    message:
      'The last active Admin team member cannot be removed or reassigned.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'team/not-found': {
    message: 'The requested team member was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'team/role-not-found': {
    message: 'The selected role is not available for this tenant.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorDef>

export type TeamErrorCode = keyof typeof TEAM_ERRORS
