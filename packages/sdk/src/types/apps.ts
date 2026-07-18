/**
 * Schemas and types for the `$876.apps` namespace (the developer portal).
 *
 * First-party, app-API-key-tier endpoints for registered OAuth clients.
 * Apps are organization-owned; user-owned developer apps are intentionally not
 * supported in the current platform model.
 *
 * Resource shapes mirror the API contract (snake_case as returned by FastAPI).
 * The SDK restates the shapes `@876/admin` also models — it can't depend on the
 * server-only admin package, and it adds runtime Zod validation the admin
 * client does not. A future `@876/core`-owned resource schema would let both
 * packages share one source of truth.
 */
import * as z from 'zod'

import type { Result } from './api.ts'

const nonEmptyString = z.string().trim().min(1)
const appStatusSchema = z.enum(['active', 'inactive'])

/** A registered OAuth client (app), as returned by `/apps`. */
export const sdk876AppSchema = z.object({
  object: z.literal('app'),
  id: nonEmptyString,
  name: z.string(),
  slug: z.string(),
  feature_prefix: z.string(),
  organization_id: z.string().nullable(),
  client_id: z.string(),
  client_type: z.string(),
  app_kind: z.enum(['internal', 'platform', 'product', 'external']),
  status: appStatusSchema,
  allowed_redirect_uris: z.array(z.string()),
  allowed_logout_uris: z.array(z.string()),
  logo_url: z.string().nullable(),
  homepage_url: z.string().nullable(),
  type: z.string(),
  scopes_allowed: z.array(z.string()),
  created_at: z.number(),
  updated_at: z.number(),
})

/**
 * The created app plus its one-time plaintext `clientSecret` (confidential
 * clients only; `null` for public/PKCE clients). The secret is returned once at
 * creation and never again.
 */
export const sdk876AppCreatedSchema = sdk876AppSchema.extend({
  clientSecret: z.string().nullable(),
})

/** The `{ object: 'list', data: [...] }` envelope from `GET /apps`. */
export const sdk876AppListSchema = z.object({
  object: z.literal('list'),
  data: z.array(sdk876AppSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().int().nullable(),
})

/** Parameters for `$876.apps.create`. */
export const sdk876AppCreateParamsSchema = z.strictObject({
  name: nonEmptyString,
  clientType: nonEmptyString,
  organizationId: z.string().nullish(),
  appKind: z.enum(['internal', 'external']).optional(),
  status: appStatusSchema.optional(),
  redirectUris: z.array(z.string()).optional(),
  homepageUrl: z.string().nullish(),
  logoUrl: z.string().nullish(),
  scopesAllowed: z.array(z.string()).optional(),
})

/** A registered OAuth client (app) owned by an organization. */
export type App = z.infer<typeof sdk876AppSchema>
/** A newly created app, including its one-time `clientSecret`. */
export type AppCreated = z.infer<typeof sdk876AppCreatedSchema>
/** A paginated list of {@link App} objects. */
export type AppList = z.infer<typeof sdk876AppListSchema>
/** Parameters accepted by `$876.apps.create`. */
export type AppCreateParams = z.input<typeof sdk876AppCreateParamsSchema>
/** Optional pagination/filter parameters for `$876.apps.list`. */
export type AppListParams = {
  limit?: number
  starting_after?: string
  ending_before?: string
  organizationId?: string
  status?: z.infer<typeof appStatusSchema>
}

/** Result envelopes returned by the `$876.apps` namespace. */
export type AppResult = Result<App>
export type AppCreatedResult = Result<AppCreated>
export type AppListResult = Result<AppList>
