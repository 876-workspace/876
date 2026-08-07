import { z } from 'zod'

/**
 * Auth request validation — mirrors `domains/auth/schemas.py` and
 * `domains/auth/me_schemas.py`.
 *
 * Where the Python used `populate_by_name=True` an alias was accepted. The
 * Express layer accepts both the canonical camelCase wire field and its
 * snake_case alias so a caller sending either form validates, matching the
 * FastAPI behaviour byte for byte.
 */

export const emailResolveBodySchema = z.strictObject({
  identifier: z.string().min(1),
})

export type EmailResolveBody = z.infer<typeof emailResolveBodySchema>

export const loginBodySchema = z.strictObject({
  identifier: z.string().min(1),
  password: z.string().min(1),
})

export type LoginBody = z.infer<typeof loginBodySchema>

export const oauthSessionBodySchema = z
  .strictObject({
    id_token: z.string().min(1).optional(),
    idToken: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.id_token ?? v.idToken), {
    message: 'id_token is required',
    path: ['id_token'],
  })

export type OAuthSessionBody = z.infer<typeof oauthSessionBodySchema>

export const registerBodySchema = z.strictObject({
  email: z.string().min(1),
  password: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

export type RegisterBody = z.infer<typeof registerBodySchema>

export const registerBusinessBodySchema = z.strictObject({
  email: z.string().min(1),
  password: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  organizationName: z.string().optional(),
  organization_name: z.string().optional(),
  organizationSlug: z.string().optional().nullable(),
  organization_slug: z.string().optional().nullable(),
})

export type RegisterBusinessBody = z.infer<typeof registerBusinessBodySchema>

export const socialLoginBodySchema = z.strictObject({
  provider: z.string().optional(),
  screenHint: z.string().optional().nullable(),
  screen_hint: z.string().optional().nullable(),
  loginHint: z.string().optional().nullable(),
  login_hint: z.string().optional().nullable(),
})

export type SocialLoginBody = z.infer<typeof socialLoginBodySchema>

export const magicOtpSendBodySchema = z.strictObject({
  email: z.string().min(1),
})

export type MagicOtpSendBody = z.infer<typeof magicOtpSendBodySchema>

export const magicOtpVerifyBodySchema = z.strictObject({
  email: z.string().min(1),
  code: z.string().min(1),
})

export type MagicOtpVerifyBody = z.infer<typeof magicOtpVerifyBodySchema>

export const recoverBodySchema = z.strictObject({
  email: z.string().min(1),
})

export type RecoverBody = z.infer<typeof recoverBodySchema>

export const resetPasswordBodySchema = z.strictObject({
  token: z.string().min(1),
  password: z.string().min(1),
})

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>

export const verifyEmailBodySchema = z.strictObject({
  code: z.string().min(1),
  pendingAuthenticationToken: z.string().optional(),
  pending_authentication_token: z.string().optional(),
  pendingAuthentication_token: z.string().optional(),
})

export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>

export const callbackBodySchema = z.strictObject({
  code: z.string().min(1),
  codeVerifier: z.string().optional().nullable(),
  code_verifier: z.string().optional().nullable(),
  invitationToken: z.string().optional().nullable(),
  invitation_token: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  ip_address: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
})

export type CallbackBody = z.infer<typeof callbackBodySchema>

export const refreshBodySchema = z.strictObject({
  refreshToken: z.string().optional(),
  refresh_token: z.string().optional(),
  organizationId: z.string().optional().nullable(),
  organization_id: z.string().optional().nullable(),
})

export type RefreshBody = z.infer<typeof refreshBodySchema>

export const switchSessionBodySchema = z.strictObject({
  sid: z.string().min(1),
})

export type SwitchSessionBody = z.infer<typeof switchSessionBodySchema>

export const sidParamsSchema = z.strictObject({ sid: z.string().min(1) })
export const sessionIdParamsSchema = z.strictObject({
  session_id: z.string().min(1),
})

export const routingMembershipsQuerySchema = z.object({
  userId: z.string().optional(),
  user_id: z.string().optional(),
  orgSlug: z.string().optional(),
  org_slug: z.string().optional(),
  status: z.string().optional(),
})

export type RoutingMembershipsQuery = z.infer<
  typeof routingMembershipsQuerySchema
>

/* Response shapes — plain z.object (not strict), used only for OpenAPI */

export const emailResolveResponseSchema = z.object({
  email: z.string(),
  exists: z.boolean(),
  business: z.boolean().nullable(),
  methods: z.array(z.string()),
})

export const authSessionUserSchema = z.object({
  object: z.literal('user'),
  id: z.string(),
  stripeCustomerId: z.string().nullable(),
  email: z.string(),
  username: z.string().nullable(),
  emailVerified: z.boolean(),
  firstName: z.string(),
  lastName: z.string(),
  middleName: z.string().nullable(),
  avatar: z.string().nullable(),
  status: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const sessionMetaSchema = z.object({
  object: z.literal('session'),
  userId: z.string(),
  expiresAt: z.number().int().nullable(),
})

export const authSessionResponseSchema = z.object({
  object: z.literal('session'),
  user: authSessionUserSchema,
  sessionMeta: sessionMetaSchema.nullable().optional(),
})

export const authEventResponseSchema = z.object({
  object: z.literal('auth_event'),
  type: z.string(),
  email: z.string().nullable(),
  pendingAuthenticationToken: z.string().nullable(),
})

export const verifiedUserResponseSchema = z.object({
  user: authSessionUserSchema,
})

export const socialLoginResponseSchema = z.object({ url: z.string() })

export const socialProviderResponseSchema = z.object({
  object: z.literal('auth_provider'),
  id: z.string(),
  label: z.string(),
  icon_slug: z.string(),
})

export const magicOtpSendResponseSchema = z.object({
  email: z.string(),
  canResendAt: z.number().int(),
})

export const recoverResponseSchema = z.object({ email: z.string() })
export const resetPasswordResponseSchema = z.object({ email: z.string() })

export const authRefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().nullable(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    emailVerified: z.boolean(),
    avatar: z.string().nullable(),
  }),
})

export const sessionSwitchResponseSchema = z.object({
  object: z.literal('session'),
  active_sid: z.string(),
  user: z.record(z.string(), z.unknown()),
})

export const sessionSignoutResponseSchema = z.object({
  object: z.literal('session'),
  signed_out: z.string(),
  remaining: z.number().int(),
})

export const sessionDataResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  error: z.null(),
})

export const emptyResponseSchema = z.object({}).passthrough()

export const routingOrganizationSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  slug: z.string(),
  status: z.string(),
  logo_url: z.string().nullable(),
})

export const routingMembershipSchema = z.object({
  id: z.string(),
  role: z.string(),
  status: z.string(),
  permissions: z.array(z.string()),
  organization: routingOrganizationSchema,
})

export const routingMembershipsResponseSchema = z.object({
  data: z.array(routingMembershipSchema),
})

export const myDeviceResponseSchema = z.object({
  object: z.literal('my_device'),
  id: z.string(),
  name: z.string(),
  device_type: z.string(),
  os_name: z.string().nullable(),
  browser_name: z.string().nullable(),
  last_country_code: z.string().nullable(),
  trusted: z.boolean(),
  sign_in_count: z.number().int(),
  first_seen_at: z.number().int(),
  last_seen_at: z.number().int(),
  is_current: z.boolean(),
})

export const mySessionResponseSchema = z.object({
  object: z.literal('my_session'),
  id: z.string(),
  device_id: z.string().nullable(),
  city: z.string().nullable(),
  country_code: z.string().nullable(),
  created_at: z.number().int(),
  last_seen_at: z.number().int().nullable(),
  expires_at: z.number().int(),
  is_current: z.boolean(),
})

export const mySessionDeletedSchema = z.object({
  object: z.literal('my_session'),
  id: z.string(),
  deleted: z.literal(true),
})
