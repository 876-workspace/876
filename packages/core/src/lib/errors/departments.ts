import type { DepartmentErrorCode } from '../../types/departments-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Department-related error codes. Keep this registry sorted by code.
 */
export const DEPARTMENT_ERRORS = {
  'department/invalid-parent': {
    message: 'A department cannot be its own parent.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'department/not-found': {
    message: 'Department not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'department/not-in-organization': {
    message: 'Department does not belong to this organization.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'department/parent-not-in-organization': {
    message: 'Parent department does not belong to this organization.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
} as const satisfies Record<DepartmentErrorCode, ErrorDef>
