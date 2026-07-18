import * as z from 'zod'

import type { ApiResult } from './api'
import type { AppError } from './errors'
import type { ProviderErrorCode } from './provider-errors'

export type ProviderJwtClaims = Record<string, unknown> & {
  iss: string
  sub: string
  aud: string
  exp: number
  iat: number
}

export const providerScopeValues = ['openid', 'profile', 'email'] as const
export const providerPromptValues = ['consent', 'login', 'none'] as const

export const providerScopeSchema = z.enum(providerScopeValues)

export const providerScopesSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.split(/\s+/).filter(Boolean))
  .pipe(z.array(providerScopeSchema).min(1))
  .refine((scopes) => scopes.includes('openid'))

export const providerPromptSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.split(/\s+/).filter(Boolean))
  .pipe(z.array(z.enum(providerPromptValues)).min(1))
  .refine((prompts) => !(prompts.includes('none') && prompts.length > 1))

export const providerAuthorizationRequestSchema = z.strictObject({
  responseType: z.literal('code'),
  clientId: z.string().trim().min(1),
  redirectUri: z.url(),
  scope: providerScopesSchema.default(['openid']),
  state: z.string().trim().min(1).optional(),
  nonce: z.string().trim().min(1).optional(),
  prompt: providerPromptSchema.optional(),
  codeChallenge: z.string().trim().min(43),
  codeChallengeMethod: z.literal('S256'),
})

export const providerTokenRequestSchema = z.strictObject({
  grantType: z.literal('authorization_code'),
  code: z.string().trim().min(1),
  redirectUri: z.url(),
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1).optional(),
  codeVerifier: z.string().trim().min(43),
})

export type ProviderAuthorizationRequest = z.infer<
  typeof providerAuthorizationRequestSchema
>

export type ProviderTokenRequest = z.infer<typeof providerTokenRequestSchema>

export type ProviderTokenResponse = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  scope: string
  id_token: string
}

export type ProviderAuthorizeResponse = {
  status: 'authorized'
  redirectTo: string
}

export type ProviderConsentRequiredResponse = {
  status: 'consent_required'
  consentPath: string
}

export type ProviderAuthorizationResponse =
  | ProviderAuthorizeResponse
  | ProviderConsentRequiredResponse

export type ProviderConsentRequest = {
  app: {
    id: string
    name: string
    clientId: string
    logoUrl: string | null
    homepageUrl: string | null
  }
  user: {
    id: string
    email: string
    name: string
    avatar: string | null
  }
  scopes: Array<(typeof providerScopeValues)[number]>
  previouslyGrantedScopes: Array<(typeof providerScopeValues)[number]>
}

export type ProviderRevokeResponse = {
  revoked: true
}

export type ProviderUserInfo = {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  picture?: string
}

export type ProviderDiscoveryDocument = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  revocation_endpoint: string
  jwks_uri: string
  response_types_supported: ['code']
  grant_types_supported: ['authorization_code']
  subject_types_supported: ['public']
  id_token_signing_alg_values_supported: ['RS256']
  scopes_supported: Array<(typeof providerScopeValues)[number]>
  code_challenge_methods_supported: ['S256']
  token_endpoint_auth_methods_supported: Array<
    'none' | 'client_secret_basic' | 'client_secret_post'
  >
  claims_supported: string[]
}

export type ProviderJwksDocument = {
  keys: Array<Record<string, unknown>>
}

export const providerTokenResponseSchema = z.strictObject({
  access_token: z.string().trim().min(1),
  token_type: z.literal('Bearer'),
  expires_in: z.int().positive(),
  scope: z.string().trim().min(1),
  id_token: z.jwt(),
}) satisfies z.ZodType<ProviderTokenResponse>

export const providerAuthorizeResponseSchema = z.strictObject({
  status: z.literal('authorized'),
  redirectTo: z.url(),
}) satisfies z.ZodType<ProviderAuthorizeResponse>

export const providerRevokeResponseSchema = z.strictObject({
  revoked: z.literal(true),
}) satisfies z.ZodType<ProviderRevokeResponse>

export const providerUserInfoSchema = z.strictObject({
  sub: z.string().trim().min(1),
  email: z.email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  preferred_username: z.string().trim().min(1).optional(),
  given_name: z.string().trim().min(1).optional(),
  family_name: z.string().trim().min(1).optional(),
  picture: z.url().optional(),
}) satisfies z.ZodType<ProviderUserInfo>

export type ProviderSdkResult<TSuccess> = ApiResult<
  TSuccess,
  AppError<ProviderErrorCode>
>
