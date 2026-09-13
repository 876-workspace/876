import { z } from 'zod'

export const billingPermissionValues = [
  'billing:access',
  'dashboard:read',
  'customers:read',
  'customers:write',
  'catalog:read',
  'catalog:write',
  'sales:read',
  'sales:write',
  'sales-orders:read',
  'sales-orders:write',
  'subscriptions:read',
  'subscriptions:write',
  'reports:read',
  'settings:read',
  'currencies:read',
  'currencies:write',
  'taxes:read',
  'taxes:write',
  'members:read',
  'members:write',
  'roles:read',
  'roles:write',
  'vendors:read',
  'vendors:write',
  'purchases:read',
  'purchases:write',
  'banking:read',
  'banking:write',
  'payments:read',
  'payments:write',
  // Handling a stored instrument is a different sensitivity from recording a
  // receipt: a bookkeeper can reconcile payments without being able to attach
  // or detach a customer's card.
  'payment_methods:read',
  'payment_methods:write',
] as const

export const billingPermissionSchema = z.enum(billingPermissionValues)

const permissionListSchema = z
  .array(billingPermissionSchema)
  .max(billingPermissionValues.length)
  .refine((permissions) => permissions.includes('billing:access'), {
    message: 'Every role must include Billing access.',
  })
  .refine(
    (permissions) =>
      permissions.every(
        (permission) =>
          !permission.endsWith(':write') ||
          permissions.includes(
            permission.replace(/:write$/, ':read') as z.infer<
              typeof billingPermissionSchema
            >
          )
      ),
    { message: 'Write permissions require the matching read permission.' }
  )

export const roleCreateBodySchema = z
  .strictObject({
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9_]{2,50}$/),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(500).optional(),
    permissions: permissionListSchema,
  })
  .meta({ id: 'RoleCreateParams' })

export const roleUpdateBodySchema = z
  .strictObject({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().min(1).max(2000).nullable().optional(),
    permissions: permissionListSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nothing to update.',
  })
  .meta({ id: 'RoleUpdateParams' })

export const memberUpdateBodySchema = z
  .strictObject({
    roleId: z.string().min(1).max(191),
    status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE'),
  })
  .meta({ id: 'MemberUpdateParams' })

export const roleParamsSchema = z.object({ roleId: z.string() })
export const memberParamsSchema = z.object({ userId: z.string() })

export const roleSchema = z
  .object({ object: z.literal('billing_role'), id: z.string() })
  .loose()

export const roleAcknowledgementSchema = z
  .object({ object: z.literal('billing_role'), id: z.string() })
  .strict()
