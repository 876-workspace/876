import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'
import type { ProviderErrorCode } from './provider-errors'

const registeredAppIdSchema = z.string().trim().min(1)
const registeredAppNameSchema = z.string().trim().min(1).max(100)
const registeredAppSlugSchema = z.string().trim().min(1).max(100)
const registeredAppClientIdSchema = z.string().trim().min(1)
const registeredAppUrlSchema = z.url()
const registeredAppScopeSchema = z.string().trim().min(1)
const registeredAppClientTypeSchema = z.enum(['public', 'confidential'])

export type RegisteredApp = {
  object: 'registered_app'
  id: string
  name: string
  slug: string
  organizationId: string | null
  clientId: string
  clientType: RegisteredAppClientType
  allowedRedirectUris: string[]
  allowedLogoutUris: string[]
  logoUrl: string | null
  homepageUrl: string | null
  type: string
  isFirstParty: boolean
  scopesAllowed: string[]
  createdAt: number
  updatedAt: number
}

export type RegisteredAppClientType = z.infer<
  typeof registeredAppClientTypeSchema
>

export type RegisteredAppCreateParams = {
  organizationId: string
  name: string
  clientType: RegisteredAppClientType
  allowedRedirectUris: string[]
  homepageUrl?: string | null
  logoUrl?: string | null
  scopesAllowed?: string[]
}

export type RegisteredAppCreated = RegisteredApp & {
  clientSecret: string | null
}

export type RegisteredAppListByOrganizationParams = {
  organizationId: string
}

export const registeredAppSchema = z.strictObject({
  object: z.literal('registered_app'),
  id: registeredAppIdSchema,
  name: registeredAppNameSchema,
  slug: registeredAppSlugSchema,
  organizationId: registeredAppIdSchema.nullable(),
  clientId: registeredAppClientIdSchema,
  clientType: registeredAppClientTypeSchema,
  allowedRedirectUris: z.array(registeredAppUrlSchema),
  allowedLogoutUris: z.array(registeredAppUrlSchema),
  logoUrl: registeredAppUrlSchema.nullable(),
  homepageUrl: registeredAppUrlSchema.nullable(),
  type: z.string().trim().min(1),
  isFirstParty: z.boolean(),
  scopesAllowed: z.array(registeredAppScopeSchema),
  createdAt: z.int().nonnegative(),
  updatedAt: z.int().nonnegative(),
}) satisfies z.ZodType<RegisteredApp>

export const registeredAppCreateParamsSchema = z.strictObject({
  organizationId: registeredAppIdSchema,
  name: registeredAppNameSchema,
  clientType: registeredAppClientTypeSchema,
  allowedRedirectUris: z.array(registeredAppUrlSchema).min(1),
  homepageUrl: registeredAppUrlSchema.nullable().optional(),
  logoUrl: registeredAppUrlSchema.nullable().optional(),
  scopesAllowed: z.array(registeredAppScopeSchema).min(1).optional(),
}) satisfies z.ZodType<RegisteredAppCreateParams>

export const registeredAppListByOrganizationParamsSchema = z.strictObject({
  organizationId: registeredAppIdSchema,
}) satisfies z.ZodType<RegisteredAppListByOrganizationParams>

export type RegisteredAppServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<ProviderErrorCode>
>
