import type { ZodType } from 'zod'

import {
  authLoginParamsSchema,
  authBusinessRegisterParamsSchema,
  authResolveEmailParamsSchema,
  authLoginWithEmailOtpParamsSchema,
  authLoginWithMagicLinkParamsSchema,
  authLoginWithPhoneOtpParamsSchema,
  authRecoverParamsSchema,
  authRegisterParamsSchema,
  authResetPasswordParamsSchema,
  authSocialLoginParamsSchema,
  authVerifyEmailAuthOtpParamsSchema,
  authVerifyEmailCodeParamsSchema,
  authVerifyEmailOtpParamsSchema,
  authVerifyPhoneOtpParamsSchema,
  type AuthErrorCode,
  type AuthValidationDataByMode,
  type AuthValidationField,
  type AuthValidationMode,
  type AuthValidationResult,
} from '../types/auth'
import { getError } from '../lib/errors'

type AuthFieldRule = {
  field: AuthValidationField
  schema: ZodType
  invalidCode: AuthErrorCode
  missingCode?: AuthErrorCode
  trim?: boolean
}

type AuthValidationConfig<Mode extends AuthValidationMode> = {
  schema: ZodType<AuthValidationDataByMode[Mode]>
  fields: readonly AuthFieldRule[]
}

const emailRule = {
  field: 'email',
  schema: authLoginWithMagicLinkParamsSchema.shape.email,
  missingCode: 'auth/missing-email',
  invalidCode: 'auth/invalid-email',
  trim: true,
} as const satisfies AuthFieldRule

const identifierRule = {
  field: 'identifier',
  schema: authResolveEmailParamsSchema.shape.identifier,
  missingCode: 'auth/missing-identifier',
  invalidCode: 'auth/invalid-identifier',
  trim: true,
} as const satisfies AuthFieldRule

const passwordRule = {
  field: 'password',
  schema: authLoginParamsSchema.shape.password,
  missingCode: 'auth/missing-password',
  invalidCode: 'auth/invalid-password',
} as const satisfies AuthFieldRule

const firstNameRule = {
  field: 'firstName',
  schema: authRegisterParamsSchema.shape.firstName,
  missingCode: 'auth/missing-first-name',
  invalidCode: 'auth/invalid-first-name',
  trim: true,
} as const satisfies AuthFieldRule

const lastNameRule = {
  field: 'lastName',
  schema: authRegisterParamsSchema.shape.lastName,
  missingCode: 'auth/missing-last-name',
  invalidCode: 'auth/invalid-last-name',
  trim: true,
} as const satisfies AuthFieldRule

const organizationNameRule = {
  field: 'organizationName',
  schema: authBusinessRegisterParamsSchema.shape.organizationName,
  missingCode: 'auth/missing-organization-name',
  invalidCode: 'auth/missing-organization-name',
  trim: true,
} as const satisfies AuthFieldRule

const organizationSlugRule = {
  field: 'organizationSlug',
  schema: authBusinessRegisterParamsSchema.shape.organizationSlug,
  missingCode: 'auth/missing-organization-slug',
  invalidCode: 'auth/invalid-input',
  trim: true,
} as const satisfies AuthFieldRule

const phoneNumberRule = {
  field: 'phoneNumber',
  schema: authLoginWithPhoneOtpParamsSchema.shape.phoneNumber,
  missingCode: 'auth/missing-phone-number',
  invalidCode: 'auth/invalid-phone-number',
  trim: true,
} as const satisfies AuthFieldRule

const codeRule = {
  field: 'code',
  schema: authVerifyEmailCodeParamsSchema.shape.code,
  missingCode: 'auth/missing-code',
  invalidCode: 'auth/invalid-code',
  trim: true,
} as const satisfies AuthFieldRule

const pendingAuthTokenRule = {
  field: 'pendingAuthToken',
  schema: authVerifyEmailAuthOtpParamsSchema.shape.pendingAuthToken,
  invalidCode: 'auth/invalid-token',
  missingCode: 'auth/invalid-token',
  trim: true,
} as const satisfies AuthFieldRule

const pendingAuthenticationTokenRule = {
  field: 'pendingAuthenticationToken',
  schema: authVerifyEmailCodeParamsSchema.shape.pendingAuthenticationToken,
  invalidCode: 'auth/invalid-token',
  missingCode: 'auth/invalid-token',
  trim: true,
} as const satisfies AuthFieldRule

const tokenRule = {
  field: 'token',
  schema: authResetPasswordParamsSchema.shape.token,
  invalidCode: 'auth/invalid-token',
  missingCode: 'auth/invalid-token',
  trim: true,
} as const satisfies AuthFieldRule

const authChallengeIdRule = {
  field: 'authenticationChallengeId',
  schema: authVerifyPhoneOtpParamsSchema.shape.authenticationChallengeId,
  invalidCode: 'auth/invalid-input',
  missingCode: 'auth/invalid-input',
  trim: true,
} as const satisfies AuthFieldRule

const providerRule = {
  field: 'provider',
  schema: authSocialLoginParamsSchema.shape.provider,
  invalidCode: 'auth/provider-disabled',
  missingCode: 'auth/provider-disabled',
} as const satisfies AuthFieldRule

const AUTH_VALIDATION_CONFIG = {
  login: {
    schema: authLoginParamsSchema,
    fields: [identifierRule, passwordRule],
  },
  register: {
    schema: authRegisterParamsSchema,
    fields: [firstNameRule, lastNameRule, emailRule, passwordRule],
  },
  'register-business': {
    schema: authBusinessRegisterParamsSchema,
    fields: [
      firstNameRule,
      lastNameRule,
      emailRule,
      passwordRule,
      organizationNameRule,
      organizationSlugRule,
    ],
  },
  'social-login': {
    schema: authSocialLoginParamsSchema,
    fields: [providerRule],
  },
  'login-with-email-otp': {
    schema: authLoginWithEmailOtpParamsSchema,
    fields: [emailRule],
  },
  'login-with-phone-otp': {
    schema: authLoginWithPhoneOtpParamsSchema,
    fields: [phoneNumberRule],
  },
  'magic-link': {
    schema: authLoginWithMagicLinkParamsSchema,
    fields: [emailRule],
  },
  'resolve-identifier': {
    schema: authResolveEmailParamsSchema,
    fields: [identifierRule],
  },
  'verify-email-otp': {
    schema: authVerifyEmailOtpParamsSchema,
    fields: [emailRule, codeRule],
  },
  'verify-phone-otp': {
    schema: authVerifyPhoneOtpParamsSchema,
    fields: [phoneNumberRule, codeRule, authChallengeIdRule],
  },
  'verify-email-auth-otp': {
    schema: authVerifyEmailAuthOtpParamsSchema,
    fields: [codeRule, pendingAuthTokenRule],
  },
  'verify-email-code': {
    schema: authVerifyEmailCodeParamsSchema,
    fields: [codeRule, pendingAuthenticationTokenRule],
  },
  recover: {
    schema: authRecoverParamsSchema,
    fields: [emailRule],
  },
  'reset-password': {
    schema: authResetPasswordParamsSchema,
    fields: [tokenRule, passwordRule],
  },
} satisfies {
  [Mode in AuthValidationMode]: AuthValidationConfig<Mode>
}

/**
 * Validates a single authentication field against the schema for a given mode.
 *
 * @param mode - The validation mode.
 * @param field - The field name to validate.
 * @param value - The raw field value.
 * @returns An error message string if invalid, otherwise undefined.
 */
export function validateAuthField<Mode extends AuthValidationMode>(
  mode: Mode,
  field: AuthValidationField,
  value: unknown
): string | undefined {
  const config = getAuthValidationConfig(mode)
  const fieldRule = config.fields.find((f) => f.field === field)
  if (!fieldRule) return undefined

  const result = fieldRule.schema.safeParse(value)
  if (!result.success) {
    const error = getError(getFieldErrorCode(fieldRule, value), {
      param: field,
    })
    return error.message
  }
  return undefined
}

/**
 * Validates authentication input against the schema for a given mode.
 *
 * @param mode - The validation mode.
 * @param params - The raw params to validate.
 * @returns The validated data or a full error.
 */
export function validateAuthInput<Mode extends AuthValidationMode>(
  mode: Mode,
  params: unknown
): AuthValidationResult<Mode> {
  const config = getAuthValidationConfig(mode)

  for (const field of config.fields) {
    const value = readField(params, field.field)
    const result = field.schema.safeParse(value)

    if (!result.success)
      return getError(getFieldErrorCode(field, value), { param: field.field })
  }

  const parseResult = config.schema.safeParse(params)

  if (!parseResult.success) return getError('auth/invalid-input')

  return parseResult.data
}

function getAuthValidationConfig<Mode extends AuthValidationMode>(
  mode: Mode
): AuthValidationConfig<Mode> {
  return AUTH_VALIDATION_CONFIG[mode] as unknown as AuthValidationConfig<Mode>
}

function getFieldErrorCode(
  field: AuthFieldRule,
  value: unknown
): AuthErrorCode {
  if (field.missingCode && isMissingValue(value, Boolean(field.trim)))
    return field.missingCode

  return field.invalidCode
}

function isMissingValue(value: unknown, trim: boolean): boolean {
  if (value === null || value === undefined) return true

  if (typeof value !== 'string') return false

  return trim ? value.trim().length === 0 : value.length === 0
}

function readField(params: unknown, field: AuthValidationField): unknown {
  if (typeof params !== 'object' || params === null) return undefined

  return (params as Record<string, unknown>)[field]
}
