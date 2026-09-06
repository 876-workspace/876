import { z } from 'zod'

import type { List } from './common'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'
import type { Role, RoleCreated, RoleDeleted } from './role'

/** The schema for a role resource returned after a write. */
export const RoleCreatedSchema = createdResourceSchema(
  'billing_role'
) satisfies z.ZodType<RoleCreated>

/** The schema for a deleted role tombstone. */
export const RoleDeletedSchema = deletedResourceSchema(
  'billing_role'
) satisfies z.ZodType<RoleDeleted>

/** The schema for a finance workspace role. */
export const RoleSchema = z.strictObject({
  object: z.literal('billing_role'),
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
  isSystem: z.boolean(),
  isDefault: z.boolean(),
  memberCount: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Role>

/** The schema for a list of finance workspace roles. */
export const RoleListSchema = listSchema(RoleSchema) satisfies z.ZodType<
  List<Role>
>
