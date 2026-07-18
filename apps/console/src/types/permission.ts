import * as z from 'zod'

/** A single permission option shown in the permission picker. */
export const permissionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
})
export type PermissionOption = z.infer<typeof permissionOptionSchema>

/** A group of related permissions shown in the permission picker. */
export const permissionGroupSchema = z.object({
  label: z.string(),
  permissions: z.array(permissionOptionSchema),
})
export type PermissionGroup = z.infer<typeof permissionGroupSchema>
