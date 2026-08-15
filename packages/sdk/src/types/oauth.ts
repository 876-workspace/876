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
  accessToken: z.string().trim().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.int().positive(),
  scope: z.string().trim().min(1),
  idToken: z.jwt().nullable().optional(),
  refreshToken: z.string().trim().min(1).nullable().optional(),
})

export const oauth876IntrospectResponseSchema = z.strictObject({
  active: z.boolean(),
  scope: z.string().trim().min(1).nullable().optional(),
  appId: z.string().trim().min(1).nullable().optional(),
  clientId: z.string().trim().min(1).nullable().optional(),
  sub: z.string().trim().min(1).nullable().optional(),
  tokenType: z.literal('Bearer').nullable().optional(),
  exp: z.int().nonnegative().nullable().optional(),
  iat: z.int().nonnegative().nullable().optional(),
})

export const oauth876UserInfoSchema = z.strictObject({
  sub: z.string().trim().min(1),
  email: z.email().optional(),
  emailVerified: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  givenName: z.string().trim().min(1).optional(),
  familyName: z.string().trim().min(1).optional(),
  picture: z.url().optional(),
})

export const oauth876DiscoveryDocumentSchema = z.strictObject({
  issuer: z.url(),
  authorizationEndpoint: z.url(),
  tokenEndpoint: z.url(),
  userinfoEndpoint: z.url(),
  revocationEndpoint: z.url(),
  introspectionEndpoint: z.url().optional(),
  jwksUri: z.url(),
  responseTypesSupported: z.array(z.literal('code')),
  grantTypesSupported: z.array(
    z.enum(['authorization_code', 'refresh_token'])
  ),
  subjectTypesSupported: z.array(z.literal('public')),
  idTokenSigningAlgValuesSupported: z.array(z.literal('RS256')),
  scopesSupported: z.array(oauth876ScopeSchema),
  codeChallengeMethodsSupported: z.array(z.literal('S256')),
  tokenEndpointAuthMethodsSupported: z.array(
    z.enum(['none', 'client_secret_basic', 'client_secret_post'])
  ),
  claimsSupported: z.array(z.string().trim().min(1)),
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
