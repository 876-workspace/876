import { z } from 'zod'

/** Request and response contracts for the OAuth authorization server. */

export const tokenResponseSchema = z
  .object({
    access_token: z
      .string()
      .meta({ description: 'The issued OAuth access token (JWT, RS256).' }),
    token_type: z.string().meta({ description: "Always 'Bearer'." }),
    expires_in: z
      .number()
      .int()
      .meta({ description: 'Seconds until the access token expires.' }),
    scope: z
      .string()
      .meta({ description: 'Space-separated list of granted scopes.' }),
    id_token: z
      .string()
      .nullable()
      .meta({ description: 'OIDC ID token, if the openid scope was granted.' }),
    refresh_token: z.string().nullable().meta({
      description: 'Refresh token, if the offline_access scope was granted.',
    }),
  })
  .meta({ id: 'OAuthTokenResponse' })

export const userinfoResponseSchema = z
  .object({
    sub: z.string(),
    email: z.string().nullable().optional(),
    email_verified: z.boolean().nullable().optional(),
    name: z.string().nullable().optional(),
    given_name: z.string().nullable().optional(),
    family_name: z.string().nullable().optional(),
    picture: z.string().nullable().optional(),
  })
  .meta({ id: 'OAuthUserinfo' })

export const introspectResponseSchema = z
  .object({
    active: z
      .boolean()
      .meta({ description: 'Whether the token is currently active.' }),
    scope: z.string().nullable().optional(),
    app_id: z.string().nullable().optional(),
    client_id: z.string().nullable().optional(),
    sub: z.string().nullable().optional(),
    token_type: z.string().nullable().optional(),
    exp: z.number().int().nullable().optional(),
    iat: z.number().int().nullable().optional(),
  })
  .meta({ id: 'OAuthIntrospection' })

export const authorizeResponseSchema = z
  .object({
    status: z.enum(['authorized', 'consent_required']),
    redirectTo: z.string().optional(),
    consentPath: z.string().optional(),
  })
  .meta({ id: 'OAuthAuthorizeResult' })

export const consentDetailsSchema = z
  .object({
    app: z.object({
      id: z.string(),
      name: z.string(),
      clientId: z.string(),
      logoUrl: z.string().nullable(),
      homepageUrl: z.string().nullable(),
    }),
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      avatar: z.string().nullable(),
    }),
    scopes: z.array(z.string()),
    previouslyGrantedScopes: z.array(z.string()),
  })
  .meta({ id: 'OAuthConsentDetails' })

export const revokeResponseSchema = z
  .object({ revoked: z.literal(true) })
  .meta({ id: 'OAuthRevokeResult' })

/**
 * The authorize/consent query parameters.
 *
 * Every field is optional with a default rather than required, because an
 * invalid request must produce the OAuth error for the *specific* problem —
 * `unsupported_response_type`, `invalid_request` — not a generic 422 from the
 * validator. The handler decides.
 */
export const authorizeQuerySchema = z.object({
  response_type: z.string().default(''),
  client_id: z.string().default(''),
  redirect_uri: z.string().default(''),
  scope: z.string().default('openid'),
  state: z.string().optional(),
  nonce: z.string().optional(),
  prompt: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional(),
  user_id: z.string().optional(),
})

export const tokenBodySchema = z.object({
  grant_type: z.string(),
  code: z.string().optional(),
  redirect_uri: z.string().optional(),
  refresh_token: z.string().optional(),
  client_id: z.string().optional(),
  code_verifier: z.string().optional(),
  client_secret: z.string().optional(),
  scope: z.string().optional(),
})

export const consentBodySchema = z.object({
  response_type: z.string().default(''),
  client_id: z.string().default(''),
  redirect_uri: z.string().default(''),
  scope: z.string().default('openid'),
  state: z.string().nullish(),
  nonce: z.string().nullish(),
  prompt: z.string().nullish(),
  code_challenge: z.string().nullish(),
  code_challenge_method: z.string().nullish(),
})

export const endSessionQuerySchema = z.object({
  id_token_hint: z.string().optional(),
  post_logout_redirect_uri: z.string().optional(),
  client_id: z.string().optional(),
  state: z.string().optional(),
})

export const tokenActionBodySchema = z.object({ token: z.string() })

export const consentQuerySchema = z.object({ user_id: z.string().optional() })

export type TokenResponse = z.infer<typeof tokenResponseSchema>
export type IntrospectResponse = z.infer<typeof introspectResponseSchema>
export type AuthorizeQuery = z.infer<typeof authorizeQuerySchema>
export type TokenBody = z.infer<typeof tokenBodySchema>
export type ConsentBody = z.infer<typeof consentBodySchema>
export type EndSessionQuery = z.infer<typeof endSessionQuerySchema>
export type TokenActionBody = z.infer<typeof tokenActionBodySchema>
