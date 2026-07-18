import * as z from 'zod'

import type { ApiResult } from './api'
import type { AppError, Error } from './errors'
import { userSchema } from './user'
import {
  workosAuthScreenHintSchema,
  workosEmailSchema,
  workosIdSchema,
  workosPhoneNumberSchema,
  workosSocialAuthProviderSchema,
  workosTokenSchema,
  workosUserSchema,
} from './workos'

import { authErrorCodeValues, authErrorCodeSchema } from './auth-errors'
import type { AuthErrorCode } from './auth-errors'

export { authErrorCodeValues, authErrorCodeSchema, type AuthErrorCode }

export type AuthApiError<Code extends AuthErrorCode = AuthErrorCode> =
  AppError<Code>

export type AuthServiceResult<
  TSuccess,
  Code extends AuthErrorCode = AuthErrorCode,
> = TSuccess | Error<Code>

export type AuthResult<TSuccess> = ApiResult<TSuccess, Error<AuthErrorCode>>

/**
 * Return type for pre-auth check stubs in `src/lib/service/auth/checks.ts`.
 */
export type AuthCheckResult =
  | { allowed: true }
  | {
      allowed: false
      code:
        | 'auth/domain-blacklisted'
        | 'auth/email-blacklisted'
        | 'auth/account-suspended'
        | 'auth/account-on-hold'
        | 'auth/account-inactive'
        | 'auth/social-access-denied'
      message?: string
    }

export type AuthFormNotice = {
  type: 'success' | 'error'
  message: string
} | null

export const authValidationModeValues = [
  'login',
  'register',
  'register-business',
  'social-login',
  'login-with-email-otp',
  'login-with-phone-otp',
  'magic-link',
  'resolve-identifier',
  'verify-email-otp',
  'verify-phone-otp',
  'verify-email-auth-otp',
  'verify-email-code',
  'recover',
  'reset-password',
] as const

export const authValidationModeSchema = z.enum(authValidationModeValues)

export const AuthValidationMode = {
  Login: 'login',
  Register: 'register',
  RegisterBusiness: 'register-business',
  SocialLogin: 'social-login',
  LoginWithEmailOtp: 'login-with-email-otp',
  LoginWithPhoneOtp: 'login-with-phone-otp',
  MagicLink: 'magic-link',
  ResolveIdentifier: 'resolve-identifier',
  VerifyEmailOtp: 'verify-email-otp',
  VerifyPhoneOtp: 'verify-phone-otp',
  VerifyEmailAuthOtp: 'verify-email-auth-otp',
  VerifyEmailCode: 'verify-email-code',
  Recover: 'recover',
  ResetPassword: 'reset-password',
} as const satisfies Record<string, z.infer<typeof authValidationModeSchema>>

export const authReturnToSchema = z.string().trim().min(1)

export const authUsernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Za-z0-9._-]+$/)

export const authIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    if (value.includes('@')) return workosEmailSchema.safeParse(value).success

    return authUsernameSchema.safeParse(value).success
  })

export const authLoginParamsSchema = z.strictObject({
  identifier: authIdentifierSchema,
  password: z.string().min(1),
})

export const authRegisterParamsSchema = z.strictObject({
  email: workosEmailSchema,
  password: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
})

export const authOrganizationNameSchema = z.string().trim().min(1).max(120)

export const authOrganizationSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)

export const authBusinessRegisterParamsSchema = authRegisterParamsSchema.extend(
  {
    organizationName: authOrganizationNameSchema,
    organizationSlug: authOrganizationSlugSchema,
  }
)

export const authApiErrorSchema = z.strictObject({
  code: authErrorCodeSchema,
  message: z.string().trim().min(1),
})

export const authUserSchema = userSchema.omit({ workosUserId: true })

export const authEventTypeSchema = z.enum(['email_verification_required'])

export const authEventSchema = z.strictObject({
  object: z.literal('auth_event'),
  type: authEventTypeSchema,
  email: workosEmailSchema,
  pendingAuthenticationToken: workosTokenSchema.optional(),
})

export const authSessionMetaSchema = z.strictObject({
  object: z.literal('session'),
  userId: z.string().trim().min(1),
  expiresAt: z.string().trim().min(1).nullable(),
})

export const authLoginSuccessDataSchema = z.strictObject({
  object: z.literal('session'),
  user: z.union([authUserSchema, workosUserSchema]),
  sessionMeta: authSessionMetaSchema,
})

export const authLoginSuccessResponseSchema = authLoginSuccessDataSchema

export const authEmailVerificationRequiredResponseSchema = z.strictObject({
  emailVerificationRequired: z.literal(true),
  email: workosEmailSchema,
  pendingAuthenticationToken: workosTokenSchema,
})

export const authEmailVerificationChallengeSchema =
  authEmailVerificationRequiredResponseSchema
    .pick({
      email: true,
      pendingAuthenticationToken: true,
    })
    .extend({
      returnTo: authReturnToSchema.optional(),
    })

export const authEmailAuthRequiredResponseSchema = z.strictObject({
  emailAuthRequired: z.literal(true),
  email: workosEmailSchema,
  pendingAuthToken: workosTokenSchema,
  canResendAt: z.int().nonnegative().optional(),
})

export const authEmailAuthChallengeSchema =
  authEmailAuthRequiredResponseSchema.pick({
    email: true,
    pendingAuthToken: true,
    canResendAt: true,
  })

export const authEmailAuthProviderChallengeSchema = z.object({
  emailAuthRequired: z.literal(true),
  email: workosEmailSchema,
  pendingAuthToken: workosTokenSchema,
  emailVerificationId: workosIdSchema,
  workosUserId: workosIdSchema.optional(),
})

export const authRegisterSuccessResponseSchema = authLoginSuccessDataSchema

const authLoginResponseDataSchema = z.union([
  authLoginSuccessDataSchema,
  authEventSchema,
])

const authRegisterResponseDataSchema = z.union([
  authLoginSuccessDataSchema,
  authEventSchema,
])

export const authLoginResponseSchema = authLoginResponseDataSchema

export const authRegisterResponseSchema = authRegisterResponseDataSchema

export const authLoginWithEmailOtpParamsSchema = z.object({
  channel: z.literal('email'),
  email: workosEmailSchema,
})

export const authLoginWithPhoneOtpParamsSchema = z.object({
  channel: z.literal('phone'),
  phoneNumber: workosPhoneNumberSchema,
})

export const authLoginWithOtpParamsSchema = z.discriminatedUnion('channel', [
  authLoginWithEmailOtpParamsSchema,
  authLoginWithPhoneOtpParamsSchema,
])

export const authLoginWithMagicLinkParamsSchema = z.object({
  email: workosEmailSchema,
})

export const authResolveEmailParamsSchema = z.strictObject({
  identifier: authIdentifierSchema,
})

export const authResolveEmailResultSchema = z.strictObject({
  email: workosEmailSchema,
  business: z
    .strictObject({
      organizationId: z.string().trim().min(1),
      name: z.string().trim().min(1),
      slug: z.string().trim().min(1),
      ssoAvailable: z.boolean(),
    })
    .nullable()
    .optional(),
})

export const authResolveEmailResponseSchema = authResolveEmailResultSchema

export const authVerifyEmailOtpParamsSchema = z.object({
  channel: z.literal('email'),
  email: workosEmailSchema,
  code: workosTokenSchema,
})

export const authVerifyPhoneOtpParamsSchema = z.object({
  channel: z.literal('phone'),
  phoneNumber: workosPhoneNumberSchema,
  authenticationChallengeId: workosIdSchema,
  code: workosTokenSchema,
})

export const authVerifyOtpParamsSchema = z.discriminatedUnion('channel', [
  authVerifyEmailOtpParamsSchema,
  authVerifyPhoneOtpParamsSchema,
])

export const authSocialLoginParamsSchema = z.strictObject({
  provider: workosSocialAuthProviderSchema,
  screenHint: workosAuthScreenHintSchema.optional(),
  loginHint: z.string().trim().min(1).optional(),
})

export const authSocialLoginResponseSchema = z.object({
  url: z.url(),
})

export const authLogoutParamsSchema = z.strictObject({})

export const authRecoverParamsSchema = z.object({
  email: workosEmailSchema,
})

export const authRecoverResponseSchema = z.object({
  email: workosEmailSchema,
})

export const authResetPasswordParamsSchema = z.object({
  token: workosTokenSchema,
  password: z.string().min(1),
})

export const authResetPasswordResponseSchema = z.strictObject({
  email: workosEmailSchema,
})

export const authResolvedLogoutParamsSchema = z.object({
  returnTo: z.url().optional(),
})

export const authVerifyEmailCodeParamsSchema = z.strictObject({
  code: workosTokenSchema,
  pendingAuthenticationToken: workosTokenSchema,
})

export const authSendEmailAuthOtpParamsSchema = z.object({
  email: workosEmailSchema,
})

export const authResendEmailAuthOtpParamsSchema =
  authSendEmailAuthOtpParamsSchema

export const authSendMagicOtpParamsSchema = z.object({
  email: workosEmailSchema,
})

export const authSendMagicOtpResponseSchema = z.strictObject({
  email: workosEmailSchema,
  canResendAt: z.int().nonnegative(),
})

export const authVerifyMagicOtpParamsSchema = z.strictObject({
  email: workosEmailSchema,
  code: workosTokenSchema,
})

export const authVerifyMagicOtpSuccessResponseSchema = z.strictObject({
  user: workosUserSchema,
})

export const authVerifyMagicOtpResponseSchema =
  authVerifyMagicOtpSuccessResponseSchema

export const authEmailAuthOtpResponseSchema = z.object({
  email: workosEmailSchema,
  sentAt: z.int().nonnegative(),
  canResendAt: z.int().nonnegative(),
  expiresAt: z.int().nonnegative(),
})

export const authVerifyEmailAuthOtpParamsSchema = z.strictObject({
  code: workosTokenSchema,
  pendingAuthToken: workosTokenSchema,
})

export const authVerifyEmailCodeSuccessResponseSchema = z.strictObject({
  user: workosUserSchema,
})

export const authVerifyEmailCodeResponseSchema =
  authVerifyEmailCodeSuccessResponseSchema

export const authVerifyEmailAuthOtpSuccessResponseSchema =
  authVerifyEmailCodeSuccessResponseSchema

export const authVerifyEmailAuthOtpResponseSchema =
  authVerifyEmailAuthOtpSuccessResponseSchema

export type AuthLoginParams = z.infer<typeof authLoginParamsSchema>
export type AuthRegisterParams = z.infer<typeof authRegisterParamsSchema>
export type AuthBusinessRegisterParams = z.infer<
  typeof authBusinessRegisterParamsSchema
>
export type AuthUser = z.infer<typeof authUserSchema>
export type AuthEventType = z.infer<typeof authEventTypeSchema>
export type AuthEvent = z.infer<typeof authEventSchema>
export type AuthSessionMeta = z.infer<typeof authSessionMetaSchema>
export type AuthLoginSuccessData = z.infer<typeof authLoginSuccessDataSchema>
export type AuthLoginResult = AuthResult<AuthLoginSuccessData | AuthEvent>
export type AuthRegisterResult = AuthResult<AuthLoginSuccessData | AuthEvent>
export type AuthBusinessRegisterResult = AuthRegisterResult
export type AuthLoginSuccessResponse = z.infer<
  typeof authLoginSuccessResponseSchema
>
export type AuthEmailVerificationRequiredResponse = z.infer<
  typeof authEmailVerificationRequiredResponseSchema
>
export type AuthEmailVerificationChallenge = z.infer<
  typeof authEmailVerificationChallengeSchema
>
export type AuthEmailAuthRequiredResponse = z.infer<
  typeof authEmailAuthRequiredResponseSchema
>
export type AuthEmailAuthChallenge = z.infer<
  typeof authEmailAuthChallengeSchema
>
export type AuthEmailAuthProviderChallenge = z.infer<
  typeof authEmailAuthProviderChallengeSchema
>
export type AuthRegisterSuccessResponse = z.infer<
  typeof authRegisterSuccessResponseSchema
>
export type AuthLoginResponse = z.infer<typeof authLoginResponseSchema>
export type AuthRegisterResponse = z.infer<typeof authRegisterResponseSchema>
export type AuthLoginWithEmailOtpParams = z.infer<
  typeof authLoginWithEmailOtpParamsSchema
>
export type AuthLoginWithPhoneOtpParams = z.infer<
  typeof authLoginWithPhoneOtpParamsSchema
>
export type AuthLoginWithOtpParams = z.infer<
  typeof authLoginWithOtpParamsSchema
>
export type AuthLoginWithMagicLinkParams = z.infer<
  typeof authLoginWithMagicLinkParamsSchema
>
export type AuthResolveEmailParams = z.infer<
  typeof authResolveEmailParamsSchema
>
export type AuthResolveEmailResult = z.infer<
  typeof authResolveEmailResultSchema
>
export type AuthResolveEmailResponse = z.infer<
  typeof authResolveEmailResponseSchema
>
export type CheckEmailAccessData = AuthResolveEmailResponse
export type CheckEmailAccessResult = AuthResult<CheckEmailAccessData>
export type AuthVerifyEmailOtpParams = z.infer<
  typeof authVerifyEmailOtpParamsSchema
>
export type AuthVerifyPhoneOtpParams = z.infer<
  typeof authVerifyPhoneOtpParamsSchema
>
export type AuthVerifyOtpParams = z.infer<typeof authVerifyOtpParamsSchema>
export type AuthSocialLoginParams = z.infer<typeof authSocialLoginParamsSchema>
export type AuthSocialLoginResponse = z.infer<
  typeof authSocialLoginResponseSchema
>
export type AuthLogoutParams = z.infer<typeof authLogoutParamsSchema>
export type AuthRecoverParams = z.infer<typeof authRecoverParamsSchema>
export type AuthRecoverResponse = z.infer<typeof authRecoverResponseSchema>
export type AuthRecoverResult = AuthResult<AuthRecoverResponse>
export type AuthResetPasswordParams = z.infer<
  typeof authResetPasswordParamsSchema
>
export type AuthResetPasswordResponse = z.infer<
  typeof authResetPasswordResponseSchema
>
export type AuthResetPasswordResult = AuthResult<AuthResetPasswordResponse>
export type AuthResolvedLogoutParams = z.infer<
  typeof authResolvedLogoutParamsSchema
>
export type AuthVerifyEmailCodeParams = z.infer<
  typeof authVerifyEmailCodeParamsSchema
>
export type AuthSendEmailAuthOtpParams = z.infer<
  typeof authSendEmailAuthOtpParamsSchema
>
export type AuthResendEmailAuthOtpParams = z.infer<
  typeof authResendEmailAuthOtpParamsSchema
>
export type AuthEmailAuthOtpResponse = z.infer<
  typeof authEmailAuthOtpResponseSchema
>
export type AuthVerifyEmailAuthOtpParams = z.infer<
  typeof authVerifyEmailAuthOtpParamsSchema
>
export type AuthVerifyEmailCodeSuccessResponse = z.infer<
  typeof authVerifyEmailCodeSuccessResponseSchema
>
export type AuthVerifyEmailCodeResponse = z.infer<
  typeof authVerifyEmailCodeResponseSchema
>
export type AuthVerifyEmailAuthOtpSuccessResponse = z.infer<
  typeof authVerifyEmailAuthOtpSuccessResponseSchema
>
export type AuthVerifyEmailAuthOtpResponse = z.infer<
  typeof authVerifyEmailAuthOtpResponseSchema
>
export type AuthSendMagicOtpParams = z.infer<
  typeof authSendMagicOtpParamsSchema
>
export type AuthSendMagicOtpResponse = z.infer<
  typeof authSendMagicOtpResponseSchema
>
export type AuthVerifyMagicOtpParams = z.infer<
  typeof authVerifyMagicOtpParamsSchema
>
export type AuthVerifyMagicOtpSuccessResponse = z.infer<
  typeof authVerifyMagicOtpSuccessResponseSchema
>
export type AuthVerifyMagicOtpResponse = z.infer<
  typeof authVerifyMagicOtpResponseSchema
>
export type AuthValidationMode = z.infer<typeof authValidationModeSchema>
export type AuthEmailAuthChallengeRecord = {
  email: string
  pendingAuthToken: string
  emailVerificationId: string
  workosUserId: string | null
  lastSentAt: bigint | null
  canResendAt: bigint | null
  expiresAt: bigint
  sendCount: number
  verifiedAt: bigint | null
}
export type AuthValidationDataByMode = {
  login: AuthLoginParams
  register: AuthRegisterParams
  'register-business': AuthBusinessRegisterParams
  'social-login': AuthSocialLoginParams
  'login-with-email-otp': AuthLoginWithEmailOtpParams
  'login-with-phone-otp': AuthLoginWithPhoneOtpParams
  'magic-link': AuthLoginWithMagicLinkParams
  'resolve-identifier': AuthResolveEmailParams
  'verify-email-otp': AuthVerifyEmailOtpParams
  'verify-phone-otp': AuthVerifyPhoneOtpParams
  'verify-email-auth-otp': AuthVerifyEmailAuthOtpParams
  'verify-email-code': AuthVerifyEmailCodeParams
  recover: AuthRecoverParams
  'reset-password': AuthResetPasswordParams
}
export type AuthValidationResult<Mode extends AuthValidationMode> =
  AuthServiceResult<AuthValidationDataByMode[Mode], AuthErrorCode>

/**
 * Authentication field names that can be validated per mode.
 */
export type AuthValidationField =
  | 'authenticationChallengeId'
  | 'code'
  | 'email'
  | 'firstName'
  | 'identifier'
  | 'lastName'
  | 'organizationName'
  | 'organizationSlug'
  | 'password'
  | 'pendingAuthToken'
  | 'pendingAuthenticationToken'
  | 'phoneNumber'
  | 'provider'
  | 'token'

/**
 * Standard SDK result envelope for auth operations.
 */
export type SdkResult<T> = ApiResult<T, AppError<AuthErrorCode>>
