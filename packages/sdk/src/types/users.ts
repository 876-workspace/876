import * as z from 'zod'

import type { Result } from './api.ts'

const nonEmptyString = z.string().trim().min(1)
const nullableString = z.string().nullable()

export const sdk876CurrentUserSchema = z.strictObject({
  object: z.literal('user'),
  id: nonEmptyString,
  email: nonEmptyString,
  username: nullableString,
  emailVerified: z.boolean(),
  firstName: z.string(),
  lastName: z.string(),
  middleName: nullableString,
  avatar: nullableString,
  avatarFileId: nullableString.optional(),
  status: z.string(),
  banned: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876RoutingOrganizationSchema = z.strictObject({
  id: nonEmptyString,
  name: nullableString,
  slug: nonEmptyString,
  status: z.string(),
  logoUrl: nullableString,
})

export const sdk876RoutingMembershipSchema = z.strictObject({
  id: nonEmptyString,
  role: z.string(),
  status: z.string(),
  permissions: z.array(z.string()),
  organization: sdk876RoutingOrganizationSchema,
})

export const sdk876RoutingMembershipListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876RoutingMembershipSchema),
  hasMore: z.boolean(),
  url: z.string(),
  totalCount: z.number().int().nullable().optional(),
})

export const sdk876GenderSchema = z.enum(['male', 'female', 'other'])

export const sdk876ConsumerProfileSchema = z.strictObject({
  object: z.literal('consumer_profile'),
  id: nonEmptyString,
  userId: nonEmptyString,
  email: nonEmptyString,
  username: nullableString,
  firstName: z.string(),
  lastName: z.string(),
  middleName: nullableString,
  nickname: nullableString,
  avatar: nullableString,
  avatarFileId: nullableString.optional(),
  gender: sdk876GenderSchema.nullable(),
  phoneNumber: nullableString,
  dateOfBirth: nullableString,
  language: nullableString,
  timezone: nullableString,
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876ConsumerProfileUpdateParamsSchema = z.strictObject({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  gender: sdk876GenderSchema.nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
})

export const sdk876ConsumerAddressSchema = z.strictObject({
  object: z.literal('address'),
  id: nonEmptyString,
  userId: nonEmptyString.nullable(),
  organizationId: nonEmptyString.nullable(),
  type: z.enum(['home', 'work', 'other']),
  label: nullableString,
  line1: nullableString,
  line2: nullableString,
  city: nullableString,
  regionId: nullableString,
  countryCode: nullableString,
  postalCode: nullableString,
  isDefault: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876ConsumerAddressListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876ConsumerAddressSchema),
  hasMore: z.boolean(),
  url: z.string(),
  totalCount: z.number().int().nullable(),
})

export const sdk876ConsumerAddressCreateParamsSchema = z.strictObject({
  type: z.enum(['home', 'work', 'other']).default('other'),
  label: z.string().nullable().optional(),
  line1: z.string().nullable().optional(),
  line2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  regionId: z.string().nullable().optional(),
  countryCode: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
})

export const sdk876ConsumerAddressUpdateParamsSchema =
  sdk876ConsumerAddressCreateParamsSchema.partial()

export const sdk876DeletedConsumerAddressSchema = z.strictObject({
  object: z.literal('address'),
  id: nonEmptyString,
  deleted: z.literal(true),
})

export const sdk876ConsumerContactUserSchema = z.strictObject({
  object: z.literal('user'),
  id: nonEmptyString,
  email: nonEmptyString,
  username: nullableString,
  firstName: z.string(),
  lastName: z.string(),
  middleName: nullableString,
  avatar: nullableString,
  avatarFileId: nullableString.optional(),
})

export const sdk876ConsumerContactSchema = z.strictObject({
  object: z.literal('user_contact'),
  id: nonEmptyString,
  ownerUserId: nonEmptyString,
  contactUserId: nonEmptyString,
  contactUser: sdk876ConsumerContactUserSchema,
  nickname: nullableString,
  notes: nullableString,
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876ConsumerContactListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876ConsumerContactSchema),
  hasMore: z.boolean(),
  url: z.string(),
  totalCount: z.number().int().nullable(),
})

export const sdk876ConsumerContactCreateParamsSchema = z.strictObject({
  contactUserId: nonEmptyString,
  nickname: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const sdk876ConsumerContactUpdateParamsSchema = z.strictObject({
  nickname: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const sdk876DeletedConsumerContactSchema = z.strictObject({
  object: z.literal('user_contact'),
  id: nonEmptyString,
  deleted: z.literal(true),
})

export type Gender = z.infer<typeof sdk876GenderSchema>
export type CurrentUser = z.infer<typeof sdk876CurrentUserSchema>
export type RoutingOrganization = z.infer<
  typeof sdk876RoutingOrganizationSchema
>
export type RoutingMembership = z.infer<typeof sdk876RoutingMembershipSchema>
export type RoutingMembershipList = z.infer<
  typeof sdk876RoutingMembershipListSchema
>
export type ConsumerProfile = z.infer<typeof sdk876ConsumerProfileSchema>
export type ConsumerProfileUpdateParams = z.input<
  typeof sdk876ConsumerProfileUpdateParamsSchema
>
export type ConsumerAddress = z.infer<typeof sdk876ConsumerAddressSchema>
export type ConsumerAddressList = z.infer<
  typeof sdk876ConsumerAddressListSchema
>
export type ConsumerAddressCreateParams = z.input<
  typeof sdk876ConsumerAddressCreateParamsSchema
>
export type ConsumerAddressUpdateParams = z.input<
  typeof sdk876ConsumerAddressUpdateParamsSchema
>
export type DeletedConsumerAddress = z.infer<
  typeof sdk876DeletedConsumerAddressSchema
>
export type ConsumerContactUser = z.infer<
  typeof sdk876ConsumerContactUserSchema
>
export type ConsumerContact = z.infer<typeof sdk876ConsumerContactSchema>
export type ConsumerContactList = z.infer<
  typeof sdk876ConsumerContactListSchema
>
export type ConsumerContactCreateParams = z.input<
  typeof sdk876ConsumerContactCreateParamsSchema
>
export type ConsumerContactUpdateParams = z.input<
  typeof sdk876ConsumerContactUpdateParamsSchema
>
export type DeletedConsumerContact = z.infer<
  typeof sdk876DeletedConsumerContactSchema
>

export type ConsumerProfileResult = Result<ConsumerProfile>
export type CurrentUserResult = Result<CurrentUser>
export type RoutingMembershipListResult = Result<RoutingMembershipList>
export type ConsumerAddressResult = Result<ConsumerAddress>
export type ConsumerAddressListResult = Result<ConsumerAddressList>
export type DeletedConsumerAddressResult = Result<DeletedConsumerAddress>
export type ConsumerContactResult = Result<ConsumerContact>
export type ConsumerContactListResult = Result<ConsumerContactList>
export type DeletedConsumerContactResult = Result<DeletedConsumerContact>
