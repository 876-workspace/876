import { z } from 'zod'
import { paginationQuerySchema } from '@/http/envelope'

export const userSchema = z
  .object({
    object: z.literal('user'),
    id: z.string(),
    company: z.string().nullable(),
    companyShortName: z.string().nullable(),
    companyLogo: z.string().nullable(),
    workosUserId: z.string(),
    stripeCustomerId: z.string().nullable(),
    email: z.string(),
    username: z.string().nullable(),
    emailVerified: z.boolean(),
    firstName: z.string(),
    lastName: z.string(),
    middleName: z.string().nullable(),
    avatar: z.string().nullable(),
    avatarFileId: z.string().nullable(),
    platformRole: z.string().nullable(),
    status: z.string(),
    banned: z.boolean(),
    bannedReason: z.string().nullable(),
    deletedAt: z.number().int().nullable(),
    deletedBy: z.string().nullable(),
    deletionReason: z.string().nullable(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  })
  .meta({ id: 'User' })

export type User = z.infer<typeof userSchema>

export const ensuredUserSchema = z
  .object({
    object: z.literal('user'),
    id: z.string(),
    stripeCustomerId: z.string().nullable(),
    email: z.string(),
    username: z.string().nullable(),
    emailVerified: z.boolean(),
    firstName: z.string(),
    lastName: z.string(),
    middleName: z.string().nullable(),
    avatar: z.string().nullable(),
    avatarFileId: z.string().nullable(),
    status: z.string(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  })
  .meta({ id: 'EnsuredUser' })

export const currentUserSchema = z
  .object({
    object: z.literal('user'),
    id: z.string(),
    email: z.string(),
    username: z.string().nullable(),
    emailVerified: z.boolean(),
    firstName: z.string(),
    lastName: z.string(),
    middleName: z.string().nullable(),
    avatar: z.string().nullable(),
    avatarFileId: z.string().nullable(),
    status: z.string(),
    banned: z.boolean(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
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
  logoUrl: z.string().nullable(),
  logoFileId: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  appKind: z.string(),
  status: z.string(),
  enrolledAt: z.number().int(),
  lastSeenAt: z.number().int(),
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
  providerId: z.string(),
  providerType: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const consumerProfileSchema = z.object({
  object: z.literal('consumer_profile'),
  id: z.string(),
  userId: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  middleName: z.string().nullable(),
  nickname: z.string().nullable(),
  avatar: z.string().nullable(),
  avatarFileId: z.string().nullable(),
  gender: z.enum(['male', 'female', 'other']).nullable(),
  phoneNumber: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  language: z.string().nullable(),
  timezone: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const consumerProfileUpdateBodySchema = z.strictObject({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
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
  ownerUserId: z.string(),
  contactUserId: z.string(),
  contactUser: z.object({
    object: z.literal('user'),
    id: z.string(),
    email: z.string(),
    username: z.string().nullable(),
    firstName: z.string(),
    lastName: z.string(),
    middleName: z.string().nullable(),
    avatar: z.string().nullable(),
    avatarFileId: z.string().nullable(),
  }),
  nickname: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
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
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  emailVerified: z.boolean().optional().nullable(),
  avatar: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
})

export type UserCreateBody = z.infer<typeof userCreateBodySchema>

export const userUpdateBodySchema = z.strictObject({
  stripeCustomerId: z.string().optional().nullable(),
  email: z.string().optional(),
  username: z.string().optional().nullable(),
  emailVerified: z.boolean().optional().nullable(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  avatarFileId: z.string().optional().nullable(),
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
  createdAt: z.number().int(),
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
  userId: z.string(),
  type: z.string(),
  label: z.string(),
  countryCode: z.string().nullable(),
  valueMasked: z.string(),
  verified: z.boolean(),
  verifiedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const userIdentificationCreateBodySchema = z.strictObject({
  type: z.string().min(1),
  value: z.string().min(1),
  countryCode: z.string().optional().nullable(),
})

export const userIdentificationUpdateBodySchema = z.strictObject({
  value: z.string().min(1),
  countryCode: z.string().optional().nullable(),
})

export const userIdentificationDeleteSchema = z.object({
  object: z.literal('user_identification'),
  id: z.string(),
  deleted: z.literal(true),
})

export const userIdentificationDiscloseBodySchema = z.strictObject({
  organizationId: z.string().min(1),
  appSlug: z.string().min(1),
  reason: z.string().optional().nullable(),
})

export const userIdentificationDisclosureSchema = z.object({
  object: z.literal('user_identification_disclosure'),
  type: z.string(),
  value: z.string(),
  countryCode: z.string().nullable(),
  verified: z.boolean(),
  disclosedAt: z.number().int(),
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
  userId: z.string(),
  scope: z.string(),
  isSet: z.boolean(),
  setAt: z.number().int().nullable(),
  lastVerifiedAt: z.number().int().nullable(),
  failedAttempts: z.number().int(),
  lockedUntil: z.number().int().nullable(),
})

export const userPinVerificationSchema = z.object({
  object: z.literal('pin_verification'),
  verified: z.boolean(),
  lockedUntil: z.number().int().nullable(),
})

export const userPinDeletedSchema = z.object({
  object: z.literal('pin'),
  userId: z.string(),
  deleted: z.literal(true),
})

export const userSessionRevokeSchema = z.object({
  object: z.literal('session_revoke'),
  userId: z.string(),
  sessionsRevoked: z.number().int(),
})

export const userAccountUnlinkSchema = z.object({
  object: z.literal('account'),
  id: z.string(),
  deleted: z.literal(true),
})

export const userAppsGroupSchema = z.object({
  object: z.literal('user_apps'),
  userId: z.string(),
  data: z.array(userAppSchema),
})

export const listUserAppsBatchQuerySchema = z.strictObject({
  user_ids: z.string().transform((s) =>
    s
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  ),
})

export type ListUserAppsBatchQuery = z.infer<
  typeof listUserAppsBatchQuerySchema
>

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  includeDeleted: z.stringbool().optional().default(false),
  status: z.string().optional(),
  ids: z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    )
    .optional(),
})

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

export const searchUsersQuerySchema = z.strictObject({
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
})

export const getByUsernameQuerySchema = z.strictObject({
  includeDeleted: z.stringbool().optional().default(false),
})

export const retrieveUserQuerySchema = z.strictObject({
  includeDeleted: z.stringbool().optional().default(false),
})

export const userIdParamsSchema = z.strictObject({ userId: z.string() })
export const userIdAndAddressIdParamsSchema = z.strictObject({
  userId: z.string(),
  addressId: z.string(),
})
export const userIdAndContactIdParamsSchema = z.strictObject({
  userId: z.string(),
  contactId: z.string(),
})
export const userIdAndAccountIdParamsSchema = z.strictObject({
  userId: z.string(),
  accountId: z.string(),
})
export const userIdAndFeatureIdParamsSchema = z.strictObject({
  userId: z.string(),
  featureId: z.string(),
})
export const userIdAndTypeParamsSchema = z.strictObject({
  userId: z.string(),
  type: z.string(),
})
export const userIdAndGrantIdParamsSchema = z.strictObject({
  userId: z.string(),
  grantId: z.string(),
})
export const addressIdParamsSchema = z.strictObject({ addressId: z.string() })
export const contactIdParamsSchema = z.strictObject({ contactId: z.string() })
export const usernameParamsSchema = z.strictObject({ username: z.string() })
export const workosUserIdParamsSchema = z.strictObject({
  workosUserId: z.string(),
})

export const listMyMembershipsQuerySchema = z.strictObject({
  status: z.string().optional(),
})

export const grantFeatureBodySchema = z.strictObject({
  featureId: z.string().min(1),
  note: z.string().optional().nullable(),
})

export const disableFeatureQuerySchema = z.strictObject({
  note: z.string().optional(),
})
