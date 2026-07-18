import * as z from 'zod'

import { auth876ResultSchema } from './api.ts'

export const auth876EmailSchema = z.string().trim().email()

export const auth876UsernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Za-z0-9._-]+$/)

export const auth876IdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    if (value.includes('@')) return auth876EmailSchema.safeParse(value).success

    return auth876UsernameSchema.safeParse(value).success
  })

export const auth876PasswordSchema = z.string().min(1)

export const auth876TokenSchema = z.string().trim().min(1)

export const auth876ChallengeIdSchema = z.string().trim().min(1)

export const auth876SocialProviderSchema = z.string().trim().min(1)

export const auth876ScreenHintSchema = z.enum(['sign-in', 'sign-up'])

export const auth876AccountTypeSchema = z.enum(['consumer', 'enterprise'])

export const auth876LoginParamsSchema = z.strictObject({
  identifier: auth876IdentifierSchema,
  password: auth876PasswordSchema,
})

export const auth876RegisterParamsSchema = z.strictObject({
  email: auth876EmailSchema,
  password: auth876PasswordSchema,
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
})

export const auth876SocialLoginParamsSchema = z.strictObject({
  provider: auth876SocialProviderSchema,
  screenHint: auth876ScreenHintSchema.optional(),
  loginHint: z.string().trim().min(1).optional(),
})

export const auth876VerifyEmailCodeParamsSchema = z.strictObject({
  code: auth876TokenSchema,
  pendingAuthenticationToken: auth876TokenSchema,
})

export const auth876RecoverParamsSchema = z.strictObject({
  email: auth876EmailSchema,
})

export const auth876ResetPasswordParamsSchema = z.strictObject({
  token: auth876TokenSchema,
  password: auth876PasswordSchema,
})

export const auth876LogoutParamsSchema = z.strictObject({})

export const auth876WorkosUserSchema = z.strictObject({
  object: z.literal('user'),
  id: z.string().trim().min(1),
  email: auth876EmailSchema,
  username: auth876UsernameSchema.nullable().optional(),
  emailVerified: z.boolean(),
  avatar: z.url().nullable(),
  firstName: z.string().trim().min(1).nullable(),
  lastName: z.string().trim().min(1).nullable(),
  lastSignInAt: z.string().trim().min(1).nullable(),
  locale: z.string().trim().min(1).nullable(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
  externalId: z.string().trim().min(1).nullable(),
  metadata: z.record(z.string(), z.string()),
})

// Nullable fields are also optional: the API serializes auth responses with
// `response_model_exclude_none=True`, so null fields are omitted entirely.
export const auth876AppUserSchema = z.strictObject({
  object: z.literal('user'),
  id: z.string().trim().min(1),
  stripeCustomerId: z.string().trim().min(1).nullable().optional(),
  email: auth876EmailSchema,
  username: auth876UsernameSchema.nullable().optional(),
  // Tolerated for compatibility: the legacy `accountType` alias for the
  // identity realm. Older API builds serialize it; kept optional so the strict
  // schema accepts them without a hard `auth/invalid-response` failure.
  accountType: auth876AccountTypeSchema.optional(),
  // The identity realm (`consumer` | `enterprise`). The API serializes this on
  // the session user; consumer and enterprise are separate identities.
  realm: auth876AccountTypeSchema.optional(),
  emailVerified: z.boolean(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  middleName: z.string().trim().min(1).nullable().optional(),
  avatar: z.url().nullable().optional(),
  status: z.string().trim().min(1),
  createdAt: z.int().nonnegative(),
  updatedAt: z.int().nonnegative(),
})

export const auth876UserSchema = z.union([
  auth876AppUserSchema,
  auth876WorkosUserSchema,
])

export const auth876SessionMetaSchema = z.strictObject({
  object: z.literal('session'),
  userId: z.string().trim().min(1),
  // Unix seconds; omitted (exclude_none) or null when the session has no expiry.
  expiresAt: z.int().nonnegative().nullable().optional(),
})

export const auth876SessionSchema = z.strictObject({
  object: z.literal('session'),
  user: auth876UserSchema,
  sessionMeta: auth876SessionMetaSchema.optional(),
  expiresAt: z.string().trim().min(1).nullable().optional(),
})

export const auth876EventTypeSchema = z.enum(['email_verification_required'])

export const auth876EventSchema = z.strictObject({
  object: z.literal('auth_event'),
  type: auth876EventTypeSchema,
  // The provider does not always echo the email back on a challenge; callers
  // fall back to the identifier they submitted.
  email: auth876EmailSchema.optional(),
  pendingAuthenticationToken: auth876TokenSchema.optional(),
})

export const auth876RedirectSchema = z.strictObject({
  url: z.url(),
})

export const auth876PasswordRecoverySchema = z.strictObject({
  email: auth876EmailSchema,
})

export const auth876PasswordResetSchema = z.strictObject({
  email: auth876EmailSchema,
})

export const auth876LogoutSchema = z.strictObject({})

export const auth876OAuthSessionParamsSchema = z.strictObject({
  idToken: auth876TokenSchema,
})

// --- Resolve (email check) ---

export const auth876ResolveParamsSchema = z.strictObject({
  identifier: auth876IdentifierSchema,
})

export const auth876AuthMethodSchema = z.enum(['password', 'otp', 'sso'])

export const auth876ResolveResponseSchema = z.object({
  email: auth876EmailSchema,
  exists: z.boolean().optional(),
  business: z.boolean().optional(),
  methods: z.array(auth876AuthMethodSchema).optional(),
  ssoProvider: auth876SocialProviderSchema.nullable().optional(),
})

// --- Magic OTP ---

export const auth876SendMagicOtpParamsSchema = z.strictObject({
  email: auth876EmailSchema,
})

export const auth876SendMagicOtpResponseSchema = z.object({
  email: auth876EmailSchema,
  canResendAt: z.number().int().nonnegative(),
})

export const auth876VerifyMagicOtpParamsSchema = z.strictObject({
  code: auth876TokenSchema,
  email: auth876EmailSchema,
})

export const auth876VerifyMagicOtpResponseSchema = z.object({
  user: auth876UserSchema,
})

// --- Business registration ---

export const auth876RegisterBusinessParamsSchema = z.strictObject({
  email: auth876EmailSchema,
  password: auth876PasswordSchema,
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  organizationName: z.string().trim().min(1),
})

export const auth876LoginResponseSchema = z.union([
  auth876SessionSchema,
  auth876EventSchema,
])

export const auth876RegisterResponseSchema = auth876LoginResponseSchema

export const auth876SocialLoginResponseSchema = auth876RedirectSchema

/** A single enabled social provider as returned by `GET /auth/providers`. */
export const auth876ProviderInfoSchema = z.strictObject({
  object: z.literal('auth_provider'),
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  icon_slug: z.string().trim().min(1),
})

/** The `{ object: 'list', data: [...] }` envelope from `GET /auth/providers`. */
export const auth876ListProvidersResponseSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(auth876ProviderInfoSchema),
  has_more: z.boolean(),
  url: z.string().trim().min(1),
  total_count: z.number().int().nullable().optional(),
})

export const auth876VerifyEmailCodeResponseSchema = z.strictObject({
  user: auth876UserSchema,
})

export const auth876RecoverResponseSchema = auth876PasswordRecoverySchema

export const auth876ResetPasswordResponseSchema = auth876PasswordResetSchema

export const auth876LogoutResponseSchema = auth876LogoutSchema

export const auth876GetSessionResponseSchema = auth876SessionSchema

export const auth876OAuthSessionResponseSchema = auth876SessionSchema

export const auth876LoginResultSchema = auth876ResultSchema(
  auth876LoginResponseSchema
)
export const auth876RegisterResultSchema = auth876ResultSchema(
  auth876RegisterResponseSchema
)
export const auth876SocialLoginResultSchema = auth876ResultSchema(
  auth876SocialLoginResponseSchema
)
export const auth876ListProvidersResultSchema = auth876ResultSchema(
  auth876ListProvidersResponseSchema
)
export const auth876VerifyEmailCodeResultSchema = auth876ResultSchema(
  auth876VerifyEmailCodeResponseSchema
)
export const auth876RecoverResultSchema = auth876ResultSchema(
  auth876RecoverResponseSchema
)
export const auth876ResetPasswordResultSchema = auth876ResultSchema(
  auth876ResetPasswordResponseSchema
)
export const auth876LogoutResultSchema = auth876ResultSchema(
  auth876LogoutResponseSchema
)
export const auth876GetSessionResultSchema = auth876ResultSchema(
  auth876GetSessionResponseSchema
)
export const auth876OAuthSessionResultSchema = auth876ResultSchema(
  auth876OAuthSessionResponseSchema
)

/** A validated email address string. */
export type Email = z.infer<typeof auth876EmailSchema>

/** A supported social login provider. */
export type SocialProvider = z.infer<typeof auth876SocialProviderSchema>

/** A hint for the social login screen to indicate sign-in or sign-up intent. */
export type ScreenHint = z.infer<typeof auth876ScreenHintSchema>

/**
 * Parameters for authenticating with username-or-email and password.
 *
 * @property identifier - The user's username or email address.
 * @property password - The user's password.
 */
export type LoginParams = z.infer<typeof auth876LoginParamsSchema>

/**
 * Parameters for registering a new account with email and password.
 *
 * @property email - The user's email address.
 * @property password - The user's password.
 * @property firstName - The user's first name.
 * @property lastName - The user's last name.
 */
export type RegisterParams = z.infer<typeof auth876RegisterParamsSchema>

/**
 * Parameters for initiating a social login flow.
 *
 * @property provider - The social login provider to use.
 * @property screenHint - Optional hint for the provider's consent screen.
 * @property loginHint - Optional email hint to pre-fill on the provider's login form.
 */
export type SocialLoginParams = z.infer<typeof auth876SocialLoginParamsSchema>

/**
 * Parameters for verifying an email verification code.
 *
 * @property code - The verification code sent to the user's email.
 * @property pendingAuthenticationToken - The pending auth token from the initial login.
 */
export type VerifyEmailCodeParams = z.infer<
  typeof auth876VerifyEmailCodeParamsSchema
>

/**
 * Parameters for requesting a password reset email.
 *
 * @property email - The email address of the account to recover.
 */
export type RecoverParams = z.infer<typeof auth876RecoverParamsSchema>

/**
 * Parameters for completing a password reset.
 *
 * @property token - The reset token from the password reset email.
 * @property password - The new password to set.
 */
export type ResetPasswordParams = z.infer<
  typeof auth876ResetPasswordParamsSchema
>

/**
 * Parameters for ending the current session.
 */
export type LogoutParams = z.infer<typeof auth876LogoutParamsSchema>

/**
 * Parameters for establishing a first-party session from an OAuth ID token.
 *
 * @property idToken - An OIDC ID token issued by the 876 OAuth provider.
 */
export type OAuthSessionParams = z.infer<typeof auth876OAuthSessionParamsSchema>

/**
 * A user object returned by the auth platform.
 *
 * This is a discriminated union of `AppUser` (platform-managed accounts) and
 * `WorkosUser` (raw WorkOS boundary user). App users have a `status` field;
 * WorkOS users have `lastSignInAt`. App-owned timestamps are Unix epoch seconds;
 * WorkOS-owned timestamps are ISO strings.
 *
 * @property object - String representing the object's type. Always `user`.
 * @property id - Unique identifier for the user.
 * @property email - The user's email address.
 * @property username - Optional username that can be used as a login handle.
 * @property emailVerified - Whether the user's email has been verified.
 * @property avatar - URL of the user's avatar, or null.
 * @property firstName - The user's first name, or null.
 * @property lastName - The user's last name, or null.
 * @property lastSignInAt - ISO timestamp of the last sign-in, or null (WorkOS user only).
 * @property locale - The user's locale string, or null (WorkOS user only).
 * @property createdAt - Unix epoch seconds (app user) or ISO string (WorkOS user) when created.
 * @property updatedAt - Unix epoch seconds (app user) or ISO string (WorkOS user) when last updated.
 * @property externalId - An external identifier for the user, or null (WorkOS user only).
 * @property metadata - Arbitrary key-value metadata attached to the user (WorkOS user only).
 * @property stripeCustomerId - Stripe customer ID, or null (app user only).
 * @property middleName - The user's middle name, or null (app user only).
 * @property status - The user's account status, e.g. `'active'` or `'inactive'` (app user only).
 */
export type User = z.infer<typeof auth876UserSchema>

/**
 * Metadata about an active session.
 *
 * @property object - String representing the object's type. Always `session`.
 * @property userId - The unique identifier of the authenticated user.
 * @property expiresAt - ISO timestamp when the session expires, or null.
 */
export type SessionMeta = z.infer<typeof auth876SessionMetaSchema>

/**
 * A session object returned after successful authentication.
 *
 * @property object - String representing the object's type. Always `session`.
 * @property user - The authenticated user object.
 * @property sessionMeta - Optional session metadata.
 * @property expiresAt - Optional ISO timestamp when the session expires.
 */
export type Session = z.infer<typeof auth876SessionSchema>

/** The type of an auth event (e.g. `email_verification_required`). */
export type AuthEventType = z.infer<typeof auth876EventTypeSchema>

/**
 * An auth event that requires additional user action before completing authentication.
 *
 * @property object - String representing the object's type. Always `auth_event`.
 * @property type - The type of auth event.
 * @property email - The email address associated with the event.
 * @property pendingAuthenticationToken - Token to continue authentication after the event is handled.
 */
export type AuthEvent = z.infer<typeof auth876EventSchema>

/**
 * A redirect response containing a URL for social login or external flow.
 *
 * @property url - The redirect URL.
 */
export type Redirect = z.infer<typeof auth876RedirectSchema>

/**
 * A password recovery confirmation indicating a reset email was sent.
 *
 * @property email - The email address the recovery email was sent to.
 */
export type PasswordRecovery = z.infer<typeof auth876PasswordRecoverySchema>

/**
 * A password reset confirmation indicating the password was changed.
 *
 * @property email - The email address of the account that was reset.
 */
export type PasswordReset = z.infer<typeof auth876PasswordResetSchema>

/** A logout response confirming the session was ended. */
export type Logout = z.infer<typeof auth876LogoutSchema>

/** A login response — either a session or an auth event requiring further action. */
export type LoginResponse = z.infer<typeof auth876LoginResponseSchema>

/** A registration response — either a session or an auth event requiring further action. */
export type RegisterResponse = z.infer<typeof auth876RegisterResponseSchema>

/** A social login response containing the provider authorization URL. */
export type SocialLoginResponse = z.infer<
  typeof auth876SocialLoginResponseSchema
>

/** A single enabled social provider returned by `getProviders`. */
export type ProviderInfo = z.infer<typeof auth876ProviderInfoSchema>

/** The list-envelope response returned by `getProviders`. */
export type ListProvidersResponse = z.infer<
  typeof auth876ListProvidersResponseSchema
>

/** A verify-email-code response containing the authenticated user. */
export type VerifyEmailCodeResponse = z.infer<
  typeof auth876VerifyEmailCodeResponseSchema
>

/** A password recovery response confirming the reset email was sent. */
export type RecoverResponse = z.infer<typeof auth876RecoverResponseSchema>

/** A password reset response confirming the password was changed. */
export type ResetPasswordResponse = z.infer<
  typeof auth876ResetPasswordResponseSchema
>

/** A logout response confirming the session was ended. */
export type LogoutResponse = z.infer<typeof auth876LogoutResponseSchema>

/** A get-session response containing the current session. */
export type GetSessionResponse = z.infer<typeof auth876GetSessionResponseSchema>

/** A session response established from an OAuth ID token. */
export type OAuthSessionResponse = z.infer<
  typeof auth876OAuthSessionResponseSchema
>

/** The result envelope returned by the login method. */
export type LoginResult = z.infer<typeof auth876LoginResultSchema>

/** The result envelope returned by the register method. */
export type RegisterResult = z.infer<typeof auth876RegisterResultSchema>

/** The result envelope returned by the getProviders method. */
export type ListProvidersResult = z.infer<
  typeof auth876ListProvidersResultSchema
>

/** The result envelope returned by the socialLogin method. */
export type SocialLoginResult = z.infer<typeof auth876SocialLoginResultSchema>

/** The result envelope returned by the verifyEmailCode method. */
export type VerifyEmailCodeResult = z.infer<
  typeof auth876VerifyEmailCodeResultSchema
>

/** The result envelope returned by the recover method. */
export type RecoverResult = z.infer<typeof auth876RecoverResultSchema>

/** The result envelope returned by the resetPassword method. */
export type ResetPasswordResult = z.infer<
  typeof auth876ResetPasswordResultSchema
>

/** The result envelope returned by the logout method. */
export type LogoutResult = z.infer<typeof auth876LogoutResultSchema>

/** The result envelope returned by the getSession method. */
export type GetSessionResult = z.infer<typeof auth876GetSessionResultSchema>

/** The result envelope returned by the createSessionFromOAuth method. */
export type OAuthSessionResult = z.infer<typeof auth876OAuthSessionResultSchema>

/** Parameters for resolving an email identifier. */
export type ResolveParams = z.infer<typeof auth876ResolveParamsSchema>

/** An available authentication method. */
export type AuthMethod = z.infer<typeof auth876AuthMethodSchema>

/** A resolve (email check) response. */
export type ResolveResponse = z.infer<typeof auth876ResolveResponseSchema>

/** The result envelope returned by the resolve method. */
export type ResolveResult = z.infer<
  ReturnType<typeof auth876ResultSchema<ResolveResponse>>
>

/** Parameters for sending a magic OTP. */
export type SendMagicOtpParams = z.infer<typeof auth876SendMagicOtpParamsSchema>

/** A send-magic-OTP response. */
export type SendMagicOtpResponse = z.infer<
  typeof auth876SendMagicOtpResponseSchema
>

/** The result envelope returned by the sendMagicOtp method. */
export type SendMagicOtpResult = z.infer<
  ReturnType<typeof auth876ResultSchema<SendMagicOtpResponse>>
>

/** Parameters for verifying a magic OTP. */
export type VerifyMagicOtpParams = z.infer<
  typeof auth876VerifyMagicOtpParamsSchema
>

/** A verify-magic-OTP response. */
export type VerifyMagicOtpResponse = z.infer<
  typeof auth876VerifyMagicOtpResponseSchema
>

/** The result envelope returned by the verifyMagicOtp method. */
export type VerifyMagicOtpResult = z.infer<
  ReturnType<typeof auth876ResultSchema<VerifyMagicOtpResponse>>
>

/** Parameters for registering a business account. */
export type RegisterBusinessParams = z.infer<
  typeof auth876RegisterBusinessParamsSchema
>

/** A register-business response. */
export type RegisterBusinessResult = RegisterResult
