import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const WIDGETS_ERRORS = {
  'widgets/collection-not-found': {
    message: 'The requested collection was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'widgets/collection-name-taken': {
    message: 'A collection with this name already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'widgets/missing-owner': {
    message: 'A widget owner is required.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'widgets/note-not-found': {
    message: 'The requested notepad entry was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'widgets/invalid-title': {
    message: 'The notepad title is invalid.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'widgets/invalid-body': {
    message: 'The notepad body is invalid.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'widgets/invalid-color': {
    message: 'The notepad color is invalid.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorDef>
