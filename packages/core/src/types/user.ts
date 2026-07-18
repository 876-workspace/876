import * as z from 'zod'

import type { ApiResult } from './api'
import type { AppError } from './errors'
import type { UserErrorCode } from './user-errors'

const userIdSchema = z.string().trim().min(1)
const userNameSchema = z.string().trim().min(1).max(100)
const optionalUserNameSchema = userNameSchema.optional()
const nullableUserNameSchema = userNameSchema.nullable()
const userEmailSchema = z.email()
const userUsernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Za-z0-9._-]+$/)
const optionalUserUsernameSchema = userUsernameSchema.optional()
const nullableUserUsernameSchema = userUsernameSchema.nullable()
const workosUserIdSchema = z.string().trim().min(1)
const stripeCustomerIdSchema = z.string().trim().min(1)
const userUnixTimestampSchema = z.int().nonnegative()
const userListLimitSchema = z.int().min(1).max(100)
const userCursorSchema = z.string().trim().min(1)
const profileTextSchema = z.string().trim().min(1).max(500)

/**
 * Serialized application user.
 */
export type User = {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'user'
  /**
   * Unique identifier for the user.
   */
  id: string
  /**
   * Unique identifier for the matching WorkOS user.
   */
  workosUserId: string
  /**
   * Unique identifier for the matching Stripe customer, if one exists.
   */
  stripeCustomerId: string | null
  /**
   * The user's email address.
   */
  email: string
  /**
   * Optional username that can be used as a login handle.
   */
  username: string | null
  /**
   * Whether the user's email has been verified by the auth provider.
   */
  emailVerified: boolean
  /**
   * The user's first name.
   */
  firstName: string
  /**
   * The user's last name.
   */
  lastName: string
  /**
   * The user's middle name.
   */
  middleName: string | null
  /**
   * URL of the user's avatar image, if available.
   */
  avatar: string | null
  /**
   * The user's account status.
   */
  status: string
  /**
   * Time at which the user was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number
  /**
   * Time at which the user was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}

/**
 * Serialized user profile.
 */
export type UserProfile = {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'user_profile'
  /**
   * Unique identifier for the profile.
   */
  id: string
  /**
   * Unique identifier for the matching user.
   */
  userId: string
  /**
   * Public biography for the user.
   */
  bio: string | null
  /**
   * Public display name for the user.
   */
  displayName: string | null
  /**
   * IANA timezone for the user.
   */
  timezone: string | null
  /**
   * Phone number for the user.
   */
  phoneNumber: string | null
  /**
   * Time at which the profile was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number
  /**
   * Time at which the profile was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}

/**
 * Deleted user tombstone.
 */
export type DeletedUser = {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'user'
  /**
   * Unique identifier for the deleted user.
   */
  id: string
  /**
   * Always true for a deleted object.
   */
  deleted: true
}

/**
 * Parameters for creating a user record.
 */
export type UserCreateParams = {
  /**
   * Unique identifier for the matching WorkOS user.
   */
  workosUserId: string
  /**
   * Unique identifier for the matching Stripe customer, if one exists.
   */
  stripeCustomerId?: string
  /**
   * The user's email address.
   */
  email: string
  /**
   * Optional username that can be used as a login handle.
   */
  username?: string
  /**
   * Whether the user's email has been verified by the auth provider.
   */
  emailVerified?: boolean
  /**
   * The user's first name.
   */
  firstName: string
  /**
   * The user's last name.
   */
  lastName: string
  /**
   * The user's middle name.
   */
  middleName?: string
  /**
   * URL of the user's avatar image, if available.
   */
  avatar?: string
  /**
   * The user's account status.
   */
  status?: string
}

/**
 * Parameters for updating a user record.
 */
export type UserUpdateParams = {
  /**
   * Unique identifier for the user to update.
   */
  userId: string
  /**
   * Unique identifier for the matching Stripe customer. Set to null to clear it.
   */
  stripeCustomerId?: string | null
  /**
   * The user's email address.
   */
  email?: string
  /**
   * Optional username that can be used as a login handle. Set to null to clear it.
   */
  username?: string | null
  /**
   * Whether the user's email has been verified by the auth provider.
   */
  emailVerified?: boolean
  /**
   * The user's first name.
   */
  firstName?: string
  /**
   * The user's last name.
   */
  lastName?: string
  /**
   * The user's middle name. Set to null to clear it.
   */
  middleName?: string | null
  /**
   * URL of the user's avatar image. Set to null to clear it.
   */
  avatar?: string | null
  /**
   * The user's account status.
   */
  status?: string
}

/**
 * Parameters for updating a user profile.
 */
export type UserProfileUpdateParams = {
  /**
   * Unique identifier for the user whose profile should be updated.
   */
  userId: string
  /**
   * Public biography for the user. Set to null to clear it.
   */
  bio?: string | null
  /**
   * Public display name for the user. Set to null to clear it.
   */
  displayName?: string | null
  /**
   * IANA timezone for the user. Set to null to clear it.
   */
  timezone?: string | null
  /**
   * Phone number for the user. Set to null to clear it.
   */
  phoneNumber?: string | null
}

/**
 * Parameters for deleting a user record.
 */
export type UserDeleteParams = {
  /**
   * Unique identifier for the user to delete.
   */
  userId: string
}

/**
 * Parameters for listing users.
 */
export type UserListParams = {
  /**
   * A limit on the number of objects to be returned.
   */
  limit?: number
  /**
   * A cursor for use in pagination.
   */
  startingAfter?: string
  /**
   * A cursor for use in pagination.
   */
  endingBefore?: string
}

/**
 * Parameters for searching users.
 */
export type UserSearchParams = {
  /**
   * The search query string.
   */
  query: string
  /**
   * A limit on the number of objects to be returned.
   */
  limit?: number
  /**
   * A cursor for the next search result page.
   */
  page?: string
}

export const userSchema = z.strictObject({
  object: z.literal('user'),
  id: userIdSchema,
  workosUserId: workosUserIdSchema,
  stripeCustomerId: stripeCustomerIdSchema.nullable(),
  email: userEmailSchema,
  username: nullableUserUsernameSchema,
  emailVerified: z.boolean(),
  firstName: userNameSchema,
  lastName: userNameSchema,
  middleName: nullableUserNameSchema,
  avatar: z.url().nullable(),
  status: userNameSchema,
  createdAt: userUnixTimestampSchema,
  updatedAt: userUnixTimestampSchema,
}) satisfies z.ZodType<User>

export const userProfileSchema = z.strictObject({
  object: z.literal('user_profile'),
  id: userIdSchema,
  userId: userIdSchema,
  bio: profileTextSchema.nullable(),
  displayName: nullableUserNameSchema,
  timezone: profileTextSchema.nullable(),
  phoneNumber: profileTextSchema.nullable(),
  createdAt: userUnixTimestampSchema,
  updatedAt: userUnixTimestampSchema,
}) satisfies z.ZodType<UserProfile>

export const deletedUserSchema = z.strictObject({
  object: z.literal('user'),
  id: userIdSchema,
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedUser>

export const userCreateParamsSchema = z.strictObject({
  workosUserId: workosUserIdSchema,
  stripeCustomerId: stripeCustomerIdSchema.optional(),
  email: userEmailSchema,
  username: optionalUserUsernameSchema,
  emailVerified: z.boolean().optional(),
  firstName: userNameSchema,
  lastName: userNameSchema,
  middleName: optionalUserNameSchema,
  avatar: z.url().optional(),
  status: userNameSchema.optional(),
}) satisfies z.ZodType<UserCreateParams>

export const userUpdateParamsSchema = z.strictObject({
  userId: userIdSchema,
  stripeCustomerId: stripeCustomerIdSchema.nullable().optional(),
  email: userEmailSchema.optional(),
  username: nullableUserUsernameSchema.optional(),
  emailVerified: z.boolean().optional(),
  firstName: optionalUserNameSchema,
  lastName: optionalUserNameSchema,
  middleName: nullableUserNameSchema.optional(),
  avatar: z.url().nullable().optional(),
  status: userNameSchema.optional(),
}) satisfies z.ZodType<UserUpdateParams>

export const userProfileUpdateParamsSchema = z.strictObject({
  userId: userIdSchema,
  bio: profileTextSchema.nullable().optional(),
  displayName: nullableUserNameSchema.optional(),
  timezone: profileTextSchema.nullable().optional(),
  phoneNumber: profileTextSchema.nullable().optional(),
}) satisfies z.ZodType<UserProfileUpdateParams>

export const userDeleteParamsSchema = z.strictObject({
  userId: userIdSchema,
}) satisfies z.ZodType<UserDeleteParams>

export const userListParamsSchema = z.strictObject({
  limit: userListLimitSchema.optional(),
  startingAfter: userIdSchema.optional(),
  endingBefore: userIdSchema.optional(),
}) satisfies z.ZodType<UserListParams>

export const userSearchParamsSchema = z.strictObject({
  query: z.string().trim().min(1),
  limit: userListLimitSchema.optional(),
  page: userCursorSchema.optional(),
}) satisfies z.ZodType<UserSearchParams>

/**
 * Raw database user record before serialization to the app User shape.
 */
export type UserRecord = {
  /** Unique identifier for the user record. */
  id: string

  /** Unique WorkOS identifier for the user. */
  workosUserId: string

  /** Stripe customer identifier, if one exists. */
  stripeCustomerId: string | null

  /** The user's email address. */
  email: string

  /** Optional username that can be used as a login handle. */
  username: string | null

  /** Whether the user's email has been verified by the auth provider. */
  emailVerified: boolean

  /** The user's first name. */
  firstName: string

  /** The user's last name. */
  lastName: string

  /** The user's middle name. */
  middleName: string | null

  /** URL of the user's avatar image, if available. */
  avatar: string | null

  /** The user's account status. */
  status: string

  /** Time at which the user was created. Measured in seconds since the Unix epoch. */
  createdAt: bigint

  /** Time at which the user was last updated. Measured in seconds since the Unix epoch. */
  updatedAt: bigint
}

/**
 * Normalized user shape stored in the client-side user store.
 */
export type UserStoreUser = {
  /** Unique identifier for the user. */
  id: string

  /** The user's first name. */
  firstName: string

  /** The user's last name. */
  lastName: string

  /** The user's phone number, if available. */
  phoneNumber: string | null

  /** The user's email address. */
  email: string

  /** Optional username that can be used as a login handle. */
  username: string | null

  /** URL of the user's avatar image, if available. */
  avatar: string | null
}

/**
 * Standard SDK result envelope for user operations.
 */
export type UserSdkResult<T> = ApiResult<T, AppError<UserErrorCode>>
