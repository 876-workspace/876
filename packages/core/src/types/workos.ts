import * as z from 'zod'

import type { Error as ServiceError } from './errors'

/**
 * Client-safe subset of the WorkOS boundary types.
 *
 * This is a trimmed copy of the platform's `types/workos` that drops every
 * `@workos-inc/node` and Prisma dependency. Only the schemas and types the
 * client fetch layer and auth UI need are reproduced here; raw provider
 * response shapes that require the server SDK stay in `apps/api`.
 */

export type WorkosRawError =
  | globalThis.Error
  | null
  | {
      cause?: unknown
      code?: unknown
      error?: unknown
      message?: unknown
      rawData?: unknown
      raw_data?: unknown
      status?: unknown
      statusCode?: unknown
      [key: string]: unknown
    }

export type WorkosServiceResult<TSuccess, Code extends string = string> =
  | TSuccess
  | ServiceError<Code>
  | WorkosRawError

export const workosIdSchema = z.string().trim().min(1)
export const workosTokenSchema = z.string().trim().min(1)
export const workosIsoDateTimeSchema = z.iso.datetime({ offset: true })
export const workosEmailSchema = z.email()
export const workosPhoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format')
export const workosIpAddressSchema = z.union([z.ipv4(), z.ipv6()])
export const workosMetadataSchema = z.record(z.string(), z.string())
export const workosNullableMetadataSchema = z.record(
  z.string(),
  z.string().nullable()
)

export type WorkosId = z.infer<typeof workosIdSchema>
export type WorkosToken = z.infer<typeof workosTokenSchema>
export type WorkosIsoDateTime = z.infer<typeof workosIsoDateTimeSchema>
export type WorkosEmail = z.infer<typeof workosEmailSchema>
export type WorkosPhoneNumber = z.infer<typeof workosPhoneNumberSchema>
export type WorkosMetadata = z.infer<typeof workosMetadataSchema>

export const workosUserSchema = z.object({
  object: z.literal('user'),
  id: workosIdSchema,
  email: workosEmailSchema,
  emailVerified: z.boolean(),
  avatar: z.url().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  lastSignInAt: workosIsoDateTimeSchema.nullable(),
  locale: z.string().nullable(),
  createdAt: workosIsoDateTimeSchema,
  updatedAt: workosIsoDateTimeSchema,
  externalId: z.string().nullable(),
  metadata: workosMetadataSchema,
})

export const workosImpersonatorSchema = z.object({
  email: workosEmailSchema,
  reason: z.string().nullable(),
})

export const workosAuthenticationMethodSchema = z.enum([
  'Password',
  'MagicAuth',
  'AppleOAuth',
  'GoogleOAuth',
  'MicrosoftOAuth',
])

export const workosOauthTokensSchema = z.object({
  accessToken: workosTokenSchema,
  refreshToken: workosTokenSchema,
  expiresAt: z.int().nonnegative(),
  scopes: z.array(z.string()),
})

export const workosAuthResponseSchema = z.object({
  user: workosUserSchema,
  organizationId: workosIdSchema.optional(),
  accessToken: z.jwt(),
  refreshToken: workosTokenSchema,
  impersonator: workosImpersonatorSchema.optional(),
  authenticationMethod: workosAuthenticationMethodSchema.optional(),
  sealedSession: workosTokenSchema.optional(),
  oauthTokens: workosOauthTokensSchema.optional(),
})

export const workosAuthScreenHintSchema = z.enum(['sign-in', 'sign-up'])

export const workosSocialAuthProviderSchema = z.enum([
  'AppleOAuth',
  'GoogleOAuth',
  'MicrosoftOAuth',
])

export type WorkosUser = z.infer<typeof workosUserSchema>
export type WorkosImpersonator = z.infer<typeof workosImpersonatorSchema>
export type WorkosAuthenticationMethod = z.infer<
  typeof workosAuthenticationMethodSchema
>
export type WorkosOauthTokens = z.infer<typeof workosOauthTokensSchema>
export type WorkosAuthResponse = z.infer<typeof workosAuthResponseSchema>
export type WorkosAuthScreenHint = z.infer<typeof workosAuthScreenHintSchema>
export type WorkosSocialAuthProvider = z.infer<
  typeof workosSocialAuthProviderSchema
>
