import { validateAuthField } from './validation'
import type { AuthValidationField, AuthValidationMode } from '../types/auth'

/**
 * Creates a TanStack Form field-level validator for auth fields.
 *
 * @param mode - The auth validation mode.
 * @param field - The field name to validate.
 * @returns A validator function compatible with TanStack Form's FieldValidators.
 */
export function authFieldValidator(
  mode: AuthValidationMode,
  field: AuthValidationField,
  options?: { skipMissing?: boolean }
) {
  return ({ value }: { value: unknown }) => {
    if (
      options?.skipMissing &&
      (value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === ''))
    )
      return undefined

    const error = validateAuthField(mode, field, value)
    return error
  }
}
