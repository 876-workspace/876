import { z } from 'zod'

import { IdSchema, optionalTextSchema } from './common'
import { BILLING_PERMISSION_VALUES } from './permission-values'

export const PermissionSchema = z.enum(BILLING_PERMISSION_VALUES)
export type Permission = z.infer<typeof PermissionSchema>

const PermissionListSchema = z
  .array(PermissionSchema)
  .max(BILLING_PERMISSION_VALUES.length)
  .refine(
    (permissions) => permissions.includes('billing:access'),
    'Every role must include Billing access.'
  )
  .refine(
    (permissions) =>
      permissions.every(
        (permission) =>
          !permission.endsWith(':write') ||
          permissions.includes(
            permission.replace(/:write$/, ':read') as Permission
          )
      ),
    'Write permissions require the matching read permission.'
  )

export const RoleSlugSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9_]{2,50}$/,
    'Use lowercase letters, numbers, and underscores.'
  )

export const RoleCreateSchema = z.strictObject({
  slug: RoleSlugSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  permissions: PermissionListSchema,
})

export const RoleUpdateSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(80).optional(),
    description: optionalTextSchema,
    permissions: PermissionListSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.')

export const MemberUpdateSchema = z.strictObject({
  roleId: IdSchema,
  status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE'),
})

export type RoleCreateParams = z.infer<typeof RoleCreateSchema>
export type RoleCreateInput = z.input<typeof RoleCreateSchema>
export type RoleUpdateParams = z.infer<typeof RoleUpdateSchema>
export type RoleUpdateInput = z.input<typeof RoleUpdateSchema>
export type MemberUpdateParams = z.infer<typeof MemberUpdateSchema>
export type MemberUpdateInput = z.input<typeof MemberUpdateSchema>

export interface RoleResource {
  object: 'billing_role'
  id: string
  slug: string
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean
  isDefault: boolean
  memberCount: number
  createdAt: number
  updatedAt: number
}

export interface MemberAccess {
  userId: string
  status: 'ACTIVE' | 'SUSPENDED'
  role: Omit<RoleResource, 'object' | 'memberCount'>
  permissions: Permission[]
}

export interface MemberUpdated {
  object: 'billing_member'
  id: string
  userId: string
}

export interface MemberView {
  userId: string
  firstName: string
  lastName: string
  email: string
  avatar: string | null
  organizationRole: string
  roleId: string
  roleName: string
  roleSlug: string
  status: 'ACTIVE' | 'SUSPENDED'
  explicitGrant: boolean
}

export interface RoleCreated {
  object: 'billing_role'
  id: string
}

export interface RoleDeleted {
  object: 'billing_role'
  id: string
  deleted: true
}
