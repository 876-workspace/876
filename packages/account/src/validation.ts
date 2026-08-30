import type { z } from 'zod'

import { createAuthError, getInvalidCredentialsMessage } from './errors.ts'
import type { AuthError, SdkAuthErrorCode } from './types/api.ts'

type RequiredAuthField = {
  field: string
  code: SdkAuthErrorCode
}

/**
 * Validates auth method parameters and returns field-specific missing-value
 * errors before falling back to the strict method schema.
 */
export function validateAuthParams<TParams>(
  schema: z.ZodType<TParams>,
  params: unknown,
  requiredFields: readonly RequiredAuthField[]
): { data: TParams; error: null } | { data: null; error: AuthError } {
  for (const field of requiredFields) {
    if (hasRequiredFieldValue(params, field.field)) continue

    return { data: null, error: createAuthError(field.code) }
  }

  return validateParams(schema, params)
}

/** Returns whether an unknown params object has a non-empty required value. */
function hasRequiredFieldValue(params: unknown, field: string): boolean {
  if (typeof params !== 'object' || params === null || Array.isArray(params))
    return false

  const value = (params as Record<string, unknown>)[field]
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0

  return true
}

/** Applies identifier-aware copy to invalid credential responses from login. */
export async function withIdentifierAwareInvalidCredentials<TSuccess>(
  resultPromise: Promise<
    { data: TSuccess; error: null } | { data: null; error: AuthError }
  >,
  identifier: string
): Promise<{ data: TSuccess; error: null } | { data: null; error: AuthError }> {
  const result = await resultPromise

  if (result.error?.code !== 'auth/invalid-credentials') return result

  return {
    data: null,
    error: createAuthError('auth/invalid-credentials', {
      message: getInvalidCredentialsMessage(identifier),
    }),
  }
}

/**
 * Validates method parameters against a Zod schema before sending a request.
 *
 * @param schema - The Zod schema to validate against.
 * @param params - The raw parameters to validate.
 * @returns A result with either the parsed data or an `auth/invalid-input` error.
 */
export function validateParams<TParams>(
  schema: z.ZodType<TParams>,
  params: unknown
): { data: TParams; error: null } | { data: null; error: AuthError } {
  const parsed = schema.safeParse(params)

  if (!parsed.success)
    return { data: null, error: createAuthError('auth/invalid-input') }

  return { data: parsed.data, error: null }
}
