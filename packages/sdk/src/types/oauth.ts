import * as z from 'zod'
import { sdkOAuthErrorCodeValues } from '../errors/oauth.ts'

export const oauth876ErrorCodeValues = sdkOAuthErrorCodeValues

export const oauth876ScopeValues = [
  'openid',
  'profile',
  'email',
  'offline_access',
] as const

export const oauth876ErrorCodeSchema = z.enum(oauth876ErrorCodeValues)

export const oauth876ScopeSchema = z.enum(oauth876ScopeValues)

export const oauth876ErrorSchema = z.strictObject({
  code: oauth876ErrorCodeSchema,
  message: z.string().trim().min(1),
})

export const oauth876ClientOptionsSchema = z.strictObject({
  baseUrl: z.url(),
  clientId: z.string().trim().min(1),
  redirectUri: z.url(),
  clientSecret: z.string().trim().min(1).optional(),
  apiKey: z.string().trim().min(1).optional(),
  fetch: z
    .custom<typeof fetch>((value): value is typeof fetch => {
      return typeof value === 'function'
    })
    .optional(),
})

export const oauth876AuthorizationUrlParamsSchema = z.strictObject({
  scope: z.array(oauth876ScopeSchema).default(['openid', 'profile', 'email']),
  state: z.string().trim().min(1).optional(),
  nonce: z.string().trim().min(1).optional(),
  prompt: z.enum(['none', 'consent', 'login']).optional(),
  codeChallenge: z.string().trim().min(43),
  redirectUri: z.url().optional(),
})

export const oauth876TokenParamsSchema = z.strictObject({
  code: z.string().trim().min(1),
  codeVerifier: z.string().trim().min(43),
  redirectUri: z.url().optional(),
})

export const oauth876RefreshTokenParamsSchema = z.strictObject({
  refreshToken: z.string().trim().min(1),
})

export const oauth876UserInfoParamsSchema = z.strictObject({
  accessToken: z.string().trim().min(1),
})

export const oauth876IntrospectParamsSchema = z.strictObject({
  token: z.string().trim().min(1),
})

export const oauth876RevokeParamsSchema = z.strictObject({
  token: z.string().trim().min(1),
})

export const oauth876TokenResponseSchema = z.strictObject({
  access_token: z.string().trim().min(1),
  token_type: z.literal('Bearer'),
  expires_in: z.int().positive(),
  scope: z.string().trim().min(1),
  id_token: z.jwt().nullable().optional(),
  refresh_token: z.string().trim().min(1).nullable().optional(),
})

export const oauth876IntrospectResponseSchema = z.strictObject({
  active: z.boolean(),
  scope: z.string().trim().min(1).nullable().optional(),
  app_id: z.string().trim().min(1).nullable().optional(),
  client_id: z.string().trim().min(1).nullable().optional(),
  sub: z.string().trim().min(1).nullable().optional(),
  token_type: z.literal('Bearer').nullable().optional(),
  exp: z.int().nonnegative().nullable().optional(),
  iat: z.int().nonnegative().nullable().optional(),
})

export const oauth876UserInfoSchema = z.strictObject({
  sub: z.string().trim().min(1),
  email: z.email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  given_name: z.string().trim().min(1).optional(),
  family_name: z.string().trim().min(1).optional(),
  picture: z.url().optional(),
})

export const oauth876DiscoveryDocumentSchema = z.strictObject({
  issuer: z.url(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  userinfo_endpoint: z.url(),
  revocation_endpoint: z.url(),
  introspection_endpoint: z.url().optional(),
  jwks_uri: z.url(),
  response_types_supported: z.array(z.literal('code')),
  grant_types_supported: z.array(
    z.enum(['authorization_code', 'refresh_token'])
  ),
  subject_types_supported: z.array(z.literal('public')),
  id_token_signing_alg_values_supported: z.array(z.literal('RS256')),
  scopes_supported: z.array(oauth876ScopeSchema),
  code_challenge_methods_supported: z.array(z.literal('S256')),
  token_endpoint_auth_methods_supported: z.array(
    z.enum(['none', 'client_secret_basic', 'client_secret_post'])
  ),
  claims_supported: z.array(z.string().trim().min(1)),
})

export const oauth876RevokeResponseSchema = z.strictObject({
  revoked: z.literal(true),
})

export type OAuthErrorCode = z.infer<typeof oauth876ErrorCodeSchema>
export type OAuthError = z.infer<typeof oauth876ErrorSchema>
export type OAuthScope = z.infer<typeof oauth876ScopeSchema>
export type OAuthClientOptions = z.input<typeof oauth876ClientOptionsSchema>
export type AuthorizationUrlParams = z.input<
  typeof oauth876AuthorizationUrlParamsSchema
>
export type TokenParams = z.infer<typeof oauth876TokenParamsSchema>
export type RefreshTokenParams = z.infer<
  typeof oauth876RefreshTokenParamsSchema
>
export type UserInfoParams = z.infer<typeof oauth876UserInfoParamsSchema>
export type IntrospectParams = z.infer<typeof oauth876IntrospectParamsSchema>
export type RevokeParams = z.infer<typeof oauth876RevokeParamsSchema>
export type TokenResponse = z.infer<typeof oauth876TokenResponseSchema>
export type IntrospectResponse = z.infer<
  typeof oauth876IntrospectResponseSchema
>
export type UserInfo = z.infer<typeof oauth876UserInfoSchema>
export type DiscoveryDocument = z.infer<typeof oauth876DiscoveryDocumentSchema>
export type RevokeResponse = z.infer<typeof oauth876RevokeResponseSchema>
export type PkcePair = {
  codeVerifier: string
  codeChallenge: string
}

export type OAuthResult<TSuccess> =
  | { data: TSuccess; error: null }
  | { data: null; error: OAuthError }
