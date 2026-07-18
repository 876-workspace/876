import * as z from 'zod'
import type { AdminMembership, AdminOrganization } from '@876/admin'

export const memberStatusSchema = z.enum(['active', 'suspended'])
export type MemberStatus = z.infer<typeof memberStatusSchema>

/** A Console member (access grant) as returned from MC DB queries. */
export const memberViewSchema = z.object({
  userId: z.string(),
  roleName: z.string(),
  status: memberStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type MemberView = z.infer<typeof memberViewSchema>

/** Parameters for retrieving a single member by their 876 user ID. */
export const memberRetrieveParamsSchema = z.strictObject({
  userId: z.string(),
})
export type MemberRetrieveParams = z.input<typeof memberRetrieveParamsSchema>

/** Parameters for listing members. */
export const memberListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  status: memberStatusSchema.optional(),
})
export type MemberListParams = z.input<typeof memberListParamsSchema>

/** Parameters for deleting a member's access grant. */
export const memberDeleteParamsSchema = z.strictObject({
  userId: z.string(),
})
export type MemberDeleteParams = z.input<typeof memberDeleteParamsSchema>

/** Platform identity for an MC-managed user: their membership and owning org. */
export type UserIdentity = {
  membership: AdminMembership
  org: AdminOrganization | null
}
