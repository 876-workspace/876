import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

export const appSchema = z
  .object({
    object: z.literal('app'),
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    feature_prefix: z.string(),
    organization_id: z.string().nullable(),
    client_id: z.string(),
    client_type: z.string(),
    app_kind: z.enum(['internal', 'platform', 'product', 'external']),
    status: z.enum(['active', 'inactive']),
    allowed_redirect_uris: z.array(z.string()),
    allowed_logout_uris: z.array(z.string()),
    logo_url: z.string().nullable(),
    logo_file_id: z.string().nullable(),
    homepage_url: z.string().nullable(),
    type: z.string(),
    scopes_allowed: z.array(z.string()),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'App' })

export const appCreatedSchema = appSchema.extend({
  client_secret: z.string().nullable(),
})

export const appPublicSchema = z
  .object({
    object: z.literal('app'),
    name: z.string(),
    logo_url: z.string().nullable(),
    logo_file_id: z.string().nullable(),
    app_kind: z.enum(['internal', 'platform', 'product', 'external']),
  })
  .meta({ id: 'AppPublic' })

export const apiKeySchema = z
  .object({
    object: z.literal('api_key'),
    id: z.string(),
    app_id: z.string(),
    name: z.string().nullable(),
    revoked: z.boolean(),
    expires_at: z.number().int().nullable(),
    last_used_at: z.number().int().nullable(),
    created_at: z.number().int(),
  })
  .meta({ id: 'ApiKey' })

export const apiKeyCreatedSchema = apiKeySchema.extend({
  key: z.string(),
})

export const appDeleteSchema = z.object({
  object: z.literal('app'),
  id: z.string(),
  deleted: z.literal(true),
})

export const apiKeyDeleteSchema = z.object({
  object: z.literal('api_key'),
  id: z.string(),
  deleted: z.literal(true),
})

export const createAppBodySchema = z.strictObject({
  organizationId: z.string().nullable().optional(),
  name: z.string().min(1),
  clientType: z.enum(['public', 'confidential']),
  appKind: z
    .enum(['internal', 'platform', 'product', 'external'])
    .default('external'),
  status: z.enum(['active', 'inactive']).default('active'),
  redirectUris: z.array(z.string()).nullable().optional(),
  homepageUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  scopesAllowed: z.array(z.string()).nullable().optional(),
})

export const updateAppBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    logo_url: z.string().nullable().optional(),
    logo_file_id: z.string().nullable().optional(),
    homepage_url: z.string().nullable().optional(),
    app_kind: z
      .enum(['internal', 'platform', 'product', 'external'])
      .nullable()
      .optional(),
    status: z.enum(['active', 'inactive']).nullable().optional(),
    organization_id: z.string().nullable().optional(),
  })
  .strict()

export const createApiKeyBodySchema = z.strictObject({
  name: z.string().nullable().optional(),
  expiresAt: z.number().int().nullable().optional(),
})

export const updateApiKeyBodySchema = z.strictObject({
  name: z.string().nullable().optional(),
})

export const listAppsQuerySchema = paginationQuerySchema.extend({
  organizationId: z.string().optional(),
  appKind: z.string().optional(),
  clientType: z.string().optional(),
  status: z.string().optional(),
})

export const listApiKeysQuerySchema = paginationQuerySchema

export const listAppFeaturesQuerySchema = paginationQuerySchema.extend({
  rootOnly: z.stringbool().optional(),
  includeTag: z.string().optional(),
  excludeTag: z.string().optional(),
})

export const appIdParamsSchema = z.strictObject({ app_id: z.string() })

export const apiKeyParamsSchema = z.strictObject({
  app_id: z.string(),
  key_id: z.string(),
})

export const clientIdParamsSchema = z.strictObject({ client_id: z.string() })

export type App = z.infer<typeof appSchema>
export type AppCreated = z.infer<typeof appCreatedSchema>
export type AppPublic = z.infer<typeof appPublicSchema>
export type ApiKey = z.infer<typeof apiKeySchema>
export type ApiKeyCreated = z.infer<typeof apiKeyCreatedSchema>
export type CreateAppBody = z.infer<typeof createAppBodySchema>
export type UpdateAppBody = z.infer<typeof updateAppBodySchema>
export type CreateApiKeyBody = z.infer<typeof createApiKeyBodySchema>
export type UpdateApiKeyBody = z.infer<typeof updateApiKeyBodySchema>
export type ListAppsQuery = z.infer<typeof listAppsQuerySchema>
export type ListApiKeysQuery = z.infer<typeof listApiKeysQuerySchema>
export type ListAppFeaturesQuery = z.infer<typeof listAppFeaturesQuerySchema>
