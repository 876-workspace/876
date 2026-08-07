import { z } from 'zod'
import { paginationQuerySchema } from '@/http/envelope'

export const userSchema = z
  .object({
    object: z.literal('user'),
    id: z.string(),
    company: z.string().nullable(),
    company_short_name: z.string().nullable(),
    company_logo: z.string().nullable(),
    workos_user_id: z.string(),
    stripe_customer_id: z.string().nullable(),
    email: z.string(),
    username: z.string().nullable(),
    email_verified: z.boolean(),
    first_name: z.string(),
    last_name: z.string(),
    middle_name: z.string().nullable(),
    avatar: z.string().nullable(),
    avatar_file_id: z.string().nullable(),
    platform_role: z.string().nullable(),
    status: z.string(),
    banned: z.boolean(),
    banned_reason: z.string().nullable(),
    deleted_at: z.number().int().nullable(),
    deleted_by: z.string().nullable(),
    deletion_reason: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'User' })

export type User = z.infer<typeof userSchema>

export const ensuredUserSchema = z
  .object({
    object: z.literal('user'),
    id: z.string(),
    stripe_customer_id: z.string().nullable(),
    email: z.string(),
    username: z.string().nullable(),
    email_verified: z.boolean(),
    first_name: z.string(),
    last_name: z.string(),
    middle_name: z.string().nullable(),
    avatar: z.string().nullable(),
    avatar_file_id: z.string().nullable(),
    status: z.string(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'EnsuredUser' })

export const currentUserSchema = z
  .object({
    object: z.literal('user'),
    id: z.string(),
    email: z.string(),
    username: z.string().nullable(),
    email_verified: z.boolean(),
    first_name: z.string(),
    last_name: z.string(),
    middle_name: z.string().nullable(),
    avatar: z.string().nullable(),
    avatar_file_id: z.string().nullable(),
    status: z.string(),
    banned: z.boolean(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'CurrentUser' })

export const userDeleteSchema = z.object({
  object: z.literal('user'),
  id: z.string(),
  deleted: z.literal(true),
})

export const userAppSchema = z.object({
  object: z.literal('app'),
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo_url: z.string().nullable(),
  logo_file_id: z.string().nullable(),
  homepage_url: z.string().nullable(),
  app_kind: z.string(),
  status: z.string(),
  enrolled_at: z.number().int(),
  last_seen_at: z.number().int(),
})

export const userBackfillUsernamesSchema = z.object({
  updated: z.number().int(),
  ids: z.array(z.string()),
})

export const userOAuthGrantRevokeSchema = z.object({
  revoked: z.boolean(),
})

export const accountSchema = z.object({
  object: z.literal('account'),
  id: z.string(),
  provider_id: z.string(),
  provider_type: z.string(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const consumerProfileSchema = z.object({
  object: z.literal('consumer_profile'),
  id: z.string(),
  user_id: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  first_name: z.string(),
  last_name: z.string(),
  middle_name: z.string().nullable(),
  nickname: z.string().nullable(),
  avatar: z.string().nullable(),
  avatar_file_id: z.string().nullable(),
  gender: z.enum(['male', 'female', 'other']).nullable(),
  phone_number: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  language: z.string().nullable(),
  timezone: z.string().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const consumerProfileUpdateBodySchema = z.strictObject({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  middle_name: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  phone_number: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
})

export type ConsumerProfileUpdateBody = z.infer<
  typeof consumerProfileUpdateBodySchema
>

export const consumerAddressCreateBodySchema = z.strictObject({
  type: z
    .enum(['billing', 'shipping', 'home', 'work', 'other'])
    .optional()
    .default('other'),
  label: z.string().optional().nullable(),
  line1: z.string().optional().nullable(),
  line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
})

export const consumerAddressUpdateBodySchema = z.strictObject({
  type: z.enum(['billing', 'shipping', 'home', 'work', 'other']).optional(),
  label: z.string().optional().nullable(),
  line1: z.string().optional().nullable(),
  line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  isDefault: z.boolean().optional().nullable(),
})

export const consumerContactCreateBodySchema = z.strictObject({
  contactUserId: z.string(),
  nickname: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const consumerContactUpdateBodySchema = z.strictObject({
  nickname: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const consumerContactSchema = z.object({
  object: z.literal('user_contact'),
  id: z.string(),
  owner_user_id: z.string(),
  contact_user_id: z.string(),
  contact_user: z.object({
    object: z.literal('user'),
    id: z.string(),
    email: z.string(),
    username: z.string().nullable(),
    first_name: z.string(),
    last_name: z.string(),
    middle_name: z.string().nullable(),
    avatar: z.string().nullable(),
    avatar_file_id: z.string().nullable(),
  }),
  nickname: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const consumerContactDeleteSchema = z.object({
  object: z.literal('user_contact'),
  id: z.string(),
  deleted: z.literal(true),
})

export const consumerProfileDeleteSchema = z.object({
  object: z.literal('consumer_profile'),
  id: z.string(),
  deleted: z.literal(true),
})

export const userCreateBodySchema = z.strictObject({
  email: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  middle_name: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  email_verified: z.boolean().optional().nullable(),
  avatar: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
})

export type UserCreateBody = z.infer<typeof userCreateBodySchema>

export const userUpdateBodySchema = z.strictObject({
  stripe_customer_id: z.string().optional().nullable(),
  email: z.string().optional(),
  username: z.string().optional().nullable(),
  email_verified: z.boolean().optional().nullable(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  middle_name: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  avatar_file_id: z.string().optional().nullable(),
  status: z.string().optional(),
})

export type UserUpdateBody = z.infer<typeof userUpdateBodySchema>

export const usernameAvailabilityQuerySchema = z.strictObject({
  username: z.string().min(1).max(64),
  exclude_user_id: z.string().optional(),
})

export const reservedUsernameCreateBodySchema = z.strictObject({
  username: z.string().min(1).max(64),
  reason: z.string().optional().nullable(),
})

export const reservedUsernameSchema = z.object({
  object: z.literal('reserved_username'),
  username: z.string(),
  reason: z.string().nullable(),
  created_at: z.number().int(),
})

export const reservedUsernameDeleteSchema = z.object({
  object: z.literal('reserved_username'),
  username: z.string(),
  deleted: z.literal(true),
})

export const userEnsureBodySchema = z.strictObject({
  workosUserId: z.string().min(1),
  email: z.string().min(1),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  emailVerified: z.boolean().optional().nullable(),
})

export type UserEnsureBody = z.infer<typeof userEnsureBodySchema>

export const authorizedAppSchema = z.object({
  object: z.literal('authorized_app'),
  id: z.string(),
  appId: z.string(),
  name: z.string(),
  clientId: z.string(),
  logoUrl: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  scopes: z.array(z.string()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const userBanBodySchema = z.strictObject({
  reason: z.string().optional().nullable(),
})

export const userIdentificationSchema = z.object({
  object: z.literal('user_identification'),
  id: z.string(),
  user_id: z.string(),
  type: z.string(),
  label: z.string(),
  country_code: z.string().nullable(),
  value_masked: z.string(),
  verified: z.boolean(),
  verified_at: z.number().int().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const userIdentificationCreateBodySchema = z.strictObject({
  type: z.string().min(1),
  value: z.string().min(1),
  country_code: z.string().optional().nullable(),
})

export const userIdentificationUpdateBodySchema = z.strictObject({
  value: z.string().min(1),
  country_code: z.string().optional().nullable(),
})

export const userIdentificationDeleteSchema = z.object({
  object: z.literal('user_identification'),
  id: z.string(),
  deleted: z.literal(true),
})

export const userIdentificationDiscloseBodySchema = z.strictObject({
  organization_id: z.string().min(1),
  app_slug: z.string().min(1),
  reason: z.string().optional().nullable(),
})

export const userIdentificationDisclosureSchema = z.object({
  object: z.literal('user_identification_disclosure'),
  type: z.string(),
  value: z.string(),
  country_code: z.string().nullable(),
  verified: z.boolean(),
  disclosed_at: z.number().int(),
})

export const userIdentificationVerifyBodySchema = z.strictObject({
  verified_by: z.string().min(1),
})

export const userPinSetBodySchema = z.strictObject({
  pin: z.string().min(1),
  scope: z.string().optional().default('account'),
})

export const userPinVerifyBodySchema = z.strictObject({
  pin: z.string().min(1),
  scope: z.string().optional().default('account'),
})

export const userPinSchema = z.object({
  object: z.literal('pin'),
  user_id: z.string(),
  scope: z.string(),
  is_set: z.boolean(),
  set_at: z.number().int().nullable(),
  last_verified_at: z.number().int().nullable(),
  failed_attempts: z.number().int(),
  locked_until: z.number().int().nullable(),
})

export const userPinVerificationSchema = z.object({
  object: z.literal('pin_verification'),
  verified: z.boolean(),
  locked_until: z.number().int().nullable(),
})

export const userPinDeletedSchema = z.object({
  object: z.literal('pin'),
  user_id: z.string(),
  deleted: z.literal(true),
})

export const userSessionRevokeSchema = z.object({
  object: z.literal('session_revoke'),
  user_id: z.string(),
  sessions_revoked: z.number().int(),
})

export const userAccountUnlinkSchema = z.object({
  object: z.literal('account'),
  id: z.string(),
  deleted: z.literal(true),
})

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  include_deleted: z.stringbool().optional().default(false),
  status: z.string().optional(),
})

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

export const searchUsersQuerySchema = z.strictObject({
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
})

export const getByUsernameQuerySchema = z.strictObject({
  include_deleted: z.stringbool().optional().default(false),
})

export const retrieveUserQuerySchema = z.strictObject({
  include_deleted: z.stringbool().optional().default(false),
})

export const userIdParamsSchema = z.strictObject({ user_id: z.string() })
export const userIdAndAddressIdParamsSchema = z.strictObject({
  user_id: z.string(),
  address_id: z.string(),
})
export const userIdAndContactIdParamsSchema = z.strictObject({
  user_id: z.string(),
  contact_id: z.string(),
})
export const userIdAndAccountIdParamsSchema = z.strictObject({
  user_id: z.string(),
  account_id: z.string(),
})
export const userIdAndFeatureIdParamsSchema = z.strictObject({
  user_id: z.string(),
  feature_id: z.string(),
})
export const userIdAndTypeParamsSchema = z.strictObject({
  user_id: z.string(),
  type: z.string(),
})
export const userIdAndGrantIdParamsSchema = z.strictObject({
  user_id: z.string(),
  grant_id: z.string(),
})
export const addressIdParamsSchema = z.strictObject({ address_id: z.string() })
export const contactIdParamsSchema = z.strictObject({ contact_id: z.string() })
export const usernameParamsSchema = z.strictObject({ username: z.string() })
export const workosUserIdParamsSchema = z.strictObject({
  workos_user_id: z.string(),
})

export const listMyMembershipsQuerySchema = z.strictObject({
  status: z.string().optional(),
})

export const grantFeatureBodySchema = z.strictObject({
  feature_id: z.string().min(1),
  note: z.string().optional().nullable(),
})

export const disableFeatureQuerySchema = z.strictObject({
  note: z.string().optional(),
})
