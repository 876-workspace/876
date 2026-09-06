import { z } from 'zod'

import { createdResourceSchema } from './common.schema'
import type { Member, MemberAccess, MemberRole, MemberUpdated } from './member'

const memberStatusSchema = z.enum(['ACTIVE', 'SUSPENDED'])

/**
 * Loose rather than strict: the projection carries timestamps and other
 * server-owned fields this contract does not model, and a member roster must
 * not fail to load because the API grew a column.
 */
const memberRoleSchema = z.looseObject({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string(),
  permissions: z.array(z.string()),
}) satisfies z.ZodType<MemberRole, MemberRole & Record<string, unknown>>

/** The schema for one explicit workspace grant. */
export const MemberSchema = z.looseObject({
  object: z.literal('billing_member'),
  id: z.string().min(1),
  userId: z.string().min(1),
  roleId: z.string().min(1),
  status: memberStatusSchema,
  role: memberRoleSchema,
}) satisfies z.ZodType<Member, Member & Record<string, unknown>>

/** The schema for the member roster projection, which is a bare array. */
export const MemberListSchema = z.array(MemberSchema)

/** The schema for one account's resolved effective access, or none. */
export const MemberAccessSchema = z
  .looseObject({
    userId: z.string().min(1),
    status: memberStatusSchema,
    role: memberRoleSchema,
    permissions: z.array(z.string()),
  })
  .nullable() satisfies z.ZodType<MemberAccess | null, unknown>

/** The schema for a member resource returned after a write. */
export const MemberUpdatedSchema = createdResourceSchema(
  'billing_member'
) satisfies z.ZodType<MemberUpdated>
