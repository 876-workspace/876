import * as z from 'zod'

import type { ApiResult } from './api'
import type { AppError } from './errors'
import type { MembershipErrorCode } from './memberships-errors'

const membershipIdSchema = z.string().trim().min(1)
const organizationIdSchema = z.string().trim().min(1)
const userIdSchema = z.string().trim().min(1)
const workosMembershipIdSchema = z.string().trim().min(1)
// Role names are open strings: orgs define custom roles beyond the seeded
// system set (owner, admin, billing_manager, member).
const membershipRoleSchema = z.string().trim().min(1).max(64)
const membershipStatusSchema = z.enum([
  'active',
  'invited',
  'suspended',
  'removed',
])
const membershipUnixTimestampSchema = z.int().nonnegative()
const membershipListLimitSchema = z.int().min(1).max(100)

export type MembershipRole = z.infer<typeof membershipRoleSchema>
export type MembershipStatus = z.infer<typeof membershipStatusSchema>

export type Membership = {
  object: 'membership'
  id: string
  organizationId: string
  userId: string
  workosMembershipId: string | null
  role: MembershipRole
  status: MembershipStatus
  createdAt: number
  updatedAt: number
}

export type DeletedMembership = {
  object: 'membership'
  id: string
  deleted: true
}

export type MembershipCreateParams = {
  organizationId: string
  userId: string
  workosMembershipId?: string
  role?: MembershipRole
  status?: MembershipStatus
}

export type MembershipUpdateParams = {
  membershipId: string
  workosMembershipId?: string | null
  role?: MembershipRole
  status?: MembershipStatus
}

export type MembershipDeleteParams = {
  membershipId: string
}

export type MembershipListParams = {
  organizationId?: string
  userId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export const membershipSchema = z.strictObject({
  object: z.literal('membership'),
  id: membershipIdSchema,
  organizationId: organizationIdSchema,
  userId: userIdSchema,
  workosMembershipId: workosMembershipIdSchema.nullable(),
  role: membershipRoleSchema,
  status: membershipStatusSchema,
  createdAt: membershipUnixTimestampSchema,
  updatedAt: membershipUnixTimestampSchema,
}) satisfies z.ZodType<Membership>

export const deletedMembershipSchema = z.strictObject({
  object: z.literal('membership'),
  id: membershipIdSchema,
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedMembership>

export const membershipCreateParamsSchema = z.strictObject({
  organizationId: organizationIdSchema,
  userId: userIdSchema,
  workosMembershipId: workosMembershipIdSchema.optional(),
  role: membershipRoleSchema.optional(),
  status: membershipStatusSchema.optional(),
}) satisfies z.ZodType<MembershipCreateParams>

export const membershipUpdateParamsSchema = z.strictObject({
  membershipId: membershipIdSchema,
  workosMembershipId: workosMembershipIdSchema.nullable().optional(),
  role: membershipRoleSchema.optional(),
  status: membershipStatusSchema.optional(),
}) satisfies z.ZodType<MembershipUpdateParams>

export const membershipDeleteParamsSchema = z.strictObject({
  membershipId: membershipIdSchema,
}) satisfies z.ZodType<MembershipDeleteParams>

export const membershipListParamsSchema = z.strictObject({
  organizationId: organizationIdSchema.optional(),
  userId: userIdSchema.optional(),
  limit: membershipListLimitSchema.optional(),
  startingAfter: membershipIdSchema.optional(),
  endingBefore: membershipIdSchema.optional(),
}) satisfies z.ZodType<MembershipListParams>

export type MembershipSdkResult<T> = ApiResult<T, AppError<MembershipErrorCode>>
