/**
 * Schemas and types for the `$876.oauthGrants` namespace (linked / connected
 * apps).
 *
 * First-party, app-API-key-tier endpoints for listing and revoking the apps a
 * user has connected via "Sign in with 876" (`/users/{id}/oauth-grants`). These
 * are NOT `AdminDep`. Distinct from `types/oauth.ts`, which models the OAuth/OIDC
 * relying-party ("Sign in with 876") flow itself. See
 * `.agents/rules/sdk-conventions.md`.
 */
import * as z from 'zod'

import type { Result } from './api.ts'

/** An app a user has connected via "Sign in with 876". */
export const sdk876OAuthGrantSchema = z.object({
  id: z.string().trim().min(1),
  appId: z.string(),
  name: z.string(),
  clientId: z.string(),
  logoUrl: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  scopes: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
})

/** Response from `$876.oauthGrants.revoke`. */
export const sdk876RevokeOAuthGrantSchema = z.object({
  revoked: z.boolean(),
})

/** An app a user has connected via "Sign in with 876". */
export type OAuthGrant = z.infer<typeof sdk876OAuthGrantSchema>
/** Response from `$876.oauthGrants.revoke`. */
export type RevokeOAuthGrantResponse = z.infer<
  typeof sdk876RevokeOAuthGrantSchema
>

/** Result envelopes returned by the `$876.oauthGrants` namespace. */
export type OAuthGrantListResult = Result<OAuthGrant[]>
export type RevokeOAuthGrantResult = Result<RevokeOAuthGrantResponse>
