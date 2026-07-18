import type { EmployeeErrorCode } from '../../types/employees-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Employee-related error codes. Keep this registry sorted by code.
 */
export const EMPLOYEE_ERRORS = {
  'employee/duplicate-membership': {
    message: 'This membership already has an employee profile.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'employee/not-found': {
    message: 'Employee profile not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<EmployeeErrorCode, ErrorDef>
