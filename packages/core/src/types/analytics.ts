import * as z from 'zod'

export const AnalyticsEvent = {
  AuthLoginSubmitted: 'auth_login_submitted',
  AuthLoginSuccess: 'auth_login_success',
  AuthLoginFailed: 'auth_login_failed',
  AuthRegisterSubmitted: 'auth_register_submitted',
  AuthRegisterSuccess: 'auth_register_success',
  AuthRegisterFailed: 'auth_register_failed',
  AuthSocialLoginSubmitted: 'auth_social_login_submitted',
  AuthSocialLoginSuccess: 'auth_social_login_success',
  AuthSocialLoginFailed: 'auth_social_login_failed',
  AuthLogoutClicked: 'auth_logout_clicked',
  AuthLogoutSucceeded: 'auth_logout_succeeded',
  AuthEmailVerificationStarted: 'auth_email_verification_started',
  AuthEmailVerificationCompleted: 'auth_email_verification_completed',
  AuthEmailVerificationFailed: 'auth_email_verification_failed',
  AuthEmailVerificationResent: 'auth_email_verification_resent',
  AuthPasswordResetRequested: 'auth_password_reset_requested',
  AuthPasswordResetCompleted: 'auth_password_reset_completed',
  AuthPasswordResetFailed: 'auth_password_reset_failed',
  AuthMagicOtpSent: 'auth_magic_otp_sent',
  AuthMagicOtpFailed: 'auth_magic_otp_failed',
  AuthMagicOtpVerified: 'auth_magic_otp_verified',
  AuthFormAbandoned: 'auth_form_abandoned',
  PageViewed: 'page_viewed',
  SessionStarted: 'session_started',
  SessionResumed: 'session_resumed',
  SessionEnded: 'session_ended',
  ApiError: 'api_error',
  ErrorUnhandledException: 'error_unhandled_exception',
  ErrorUnhandledRejection: 'error_unhandled_rejection',
  NetworkRequestFailed: 'network_request_failed',
} as const

export const analyticsEventValues = Object.values(AnalyticsEvent) as [
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent],
  ...(typeof AnalyticsEvent)[keyof typeof AnalyticsEvent][],
]

export const analyticsEventNameSchema = z.enum(analyticsEventValues)

/** Union of all analytics event names that can be tracked. */
export type AnalyticsEventName = z.infer<typeof analyticsEventNameSchema>

export const analyticsPropertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
  z.array(z.number()),
  z.array(z.boolean()),
])

export const analyticsPropertiesSchema = z.record(
  z.string(),
  analyticsPropertyValueSchema
)

export const analyticsRawPropertiesSchema = z.record(z.string(), z.unknown())

export const analyticsUserSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  emailVerified: z.boolean().nullable().optional(),
})

export const analyticsErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  httpStatus: z.int().optional(),
  description: z.string().optional(),
  param: z.string().optional(),
})

const optionalNullableStringSchema = z.string().nullable().optional()
const optionalNullableNumberSchema = z.number().nullable().optional()
const optionalBooleanSchema = z.boolean().optional()

export const analyticsEventPropertiesSchema = {
  [AnalyticsEvent.AuthLoginSubmitted]: z.strictObject({
    email: optionalNullableStringSchema,
    identifier: optionalNullableStringSchema,
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthLoginSuccess]: z.strictObject({
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthLoginFailed]: z.strictObject({
    email: optionalNullableStringSchema,
    identifier: optionalNullableStringSchema,
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthRegisterSubmitted]: z.strictObject({
    account_type: optionalNullableStringSchema,
    email: optionalNullableStringSchema,
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthRegisterSuccess]: z.strictObject({
    account_type: optionalNullableStringSchema,
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthRegisterFailed]: z.strictObject({
    account_type: optionalNullableStringSchema,
    email: optionalNullableStringSchema,
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthSocialLoginSubmitted]: z.strictObject({
    provider: optionalNullableStringSchema,
    redirect_to: optionalNullableStringSchema,
    screen_hint: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthSocialLoginSuccess]: z.strictObject({
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthSocialLoginFailed]: z.strictObject({
    provider: optionalNullableStringSchema,
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthLogoutClicked]: z.strictObject({
    return_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthLogoutSucceeded]: z.strictObject({
    return_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthEmailVerificationStarted]: z.strictObject({
    flow: z.string().optional(),
    email: optionalNullableStringSchema,
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthEmailVerificationCompleted]: z.strictObject({
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthEmailVerificationFailed]: z.strictObject({
    email: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthEmailVerificationResent]: z.strictObject({
    email: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthPasswordResetRequested]: z.strictObject({
    email: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthPasswordResetCompleted]: z.strictObject({
    email: optionalNullableStringSchema,
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthPasswordResetFailed]: z.strictObject({
    email: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthMagicOtpSent]: z.strictObject({
    email: optionalNullableStringSchema,
    identifier: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthMagicOtpFailed]: z.strictObject({
    email: optionalNullableStringSchema,
    identifier: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthMagicOtpVerified]: z.strictObject({
    redirect_to: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.AuthFormAbandoned]: z.strictObject({
    flow: z.string(),
    email_entered: optionalBooleanSchema,
    identifier_entered: optionalBooleanSchema,
    password_entered: optionalBooleanSchema,
  }),
  [AnalyticsEvent.PageViewed]: z.strictObject({
    path: optionalNullableStringSchema,
    search: optionalNullableStringSchema,
    referrer: optionalNullableStringSchema,
    title: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.ApiError]: z.strictObject({
    route: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.ErrorUnhandledException]: z.strictObject({
    message: optionalNullableStringSchema,
    filename: optionalNullableStringSchema,
    line: optionalNullableNumberSchema,
    column: optionalNullableNumberSchema,
  }),
  [AnalyticsEvent.ErrorUnhandledRejection]: z.strictObject({
    reason: optionalNullableStringSchema,
  }),
  [AnalyticsEvent.NetworkRequestFailed]: z.strictObject({
    url: optionalNullableStringSchema,
    method: optionalNullableStringSchema,
    status_code: optionalNullableNumberSchema,
  }),
} as const

/** Valid property value types for analytics events. */
export type AnalyticsPropertyValue = z.infer<
  typeof analyticsPropertyValueSchema
>

/** Record of sanitized analytics event properties. */
export type AnalyticsProperties = z.infer<typeof analyticsPropertiesSchema>

/** Record of raw analytics event properties before sanitization. */
export type AnalyticsRawProperties = z.infer<
  typeof analyticsRawPropertiesSchema
>

/** Serialized analytics user for identification. */
export type AnalyticsUser = z.infer<typeof analyticsUserSchema>

/** Serialized auth analytics user with a guaranteed email field. */
export type AuthAnalyticsUser = AnalyticsUser & {
  email: string
}

/** Serialized analytics error data. */
export type AnalyticsError = z.infer<typeof analyticsErrorSchema>

/** Map of analytics event names to their property shapes. */
export type AnalyticsEventProperties = {
  [Event in keyof typeof analyticsEventPropertiesSchema]: z.infer<
    (typeof analyticsEventPropertiesSchema)[Event]
  >
}

/** Resolves the property shape for a given analytics event. */
export type AnalyticsEventPropertiesFor<TEvent extends AnalyticsEventName> =
  TEvent extends keyof AnalyticsEventProperties
    ? AnalyticsEventProperties[TEvent]
    : AnalyticsRawProperties

/**
 * Standard UTM tracking parameter keys.
 */
export type UtmKey =
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_term'
  | 'utm_content'
