import * as z from 'zod'

import type { Result } from './api.ts'

const nonEmptyString = z.string().trim().min(1)
const nullableString = z.string().nullable()

export const sdk876GenderSchema = z.enum(['male', 'female', 'other'])

export const sdk876ConsumerProfileSchema = z.strictObject({
  object: z.literal('consumer_profile'),
  id: nonEmptyString,
  user_id: nonEmptyString,
  email: nonEmptyString,
  username: nullableString,
  first_name: z.string(),
  last_name: z.string(),
  middle_name: nullableString,
  nickname: nullableString,
  avatar: nullableString,
  gender: sdk876GenderSchema.nullable(),
  phone_number: nullableString,
  date_of_birth: nullableString,
  language: nullableString,
  timezone: nullableString,
  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876ConsumerProfileUpdateParamsSchema = z.strictObject({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  middle_name: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  gender: sdk876GenderSchema.nullable().optional(),
  phone_number: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
})

export const sdk876ConsumerAddressSchema = z.strictObject({
  object: z.literal('address'),
  id: nonEmptyString,
  user_id: nonEmptyString.nullable(),
  organization_id: nonEmptyString.nullable(),
  type: z.enum(['home', 'work', 'other']),
  label: nullableString,
  line1: nullableString,
  line2: nullableString,
  city: nullableString,
  region_id: nullableString,
  country_code: nullableString,
  postal_code: nullableString,
  is_default: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876ConsumerAddressListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876ConsumerAddressSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().int().nullable(),
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
  first_name: z.string(),
  last_name: z.string(),
  middle_name: nullableString,
  avatar: nullableString,
})

export const sdk876ConsumerContactSchema = z.strictObject({
  object: z.literal('user_contact'),
  id: nonEmptyString,
  owner_user_id: nonEmptyString,
  contact_user_id: nonEmptyString,
  contact_user: sdk876ConsumerContactUserSchema,
  nickname: nullableString,
  notes: nullableString,
  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876ConsumerContactListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876ConsumerContactSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().int().nullable(),
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
export type ConsumerAddressResult = Result<ConsumerAddress>
export type ConsumerAddressListResult = Result<ConsumerAddressList>
export type DeletedConsumerAddressResult = Result<DeletedConsumerAddress>
export type ConsumerContactResult = Result<ConsumerContact>
export type ConsumerContactListResult = Result<ConsumerContactList>
export type DeletedConsumerContactResult = Result<DeletedConsumerContact>
