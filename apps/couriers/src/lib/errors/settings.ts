import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const SETTINGS_ERRORS = {
  'settings/organization-required': {
    message: 'Organization is required.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'settings/invalid-module-state': {
    message: 'The module state is invalid.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'settings/invalid-preferences': {
    message: 'The module preferences are invalid.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'settings/unknown-module': {
    message: 'The requested settings module was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'settings/invalid-profile': {
    message: 'Invalid organization profile.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
} as const satisfies Record<string, ErrorDef>
