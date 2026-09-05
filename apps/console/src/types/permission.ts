import * as z from 'zod'

/** A single permission option shown in the permission picker. */
export const permissionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
})
export type PermissionOption = z.infer<typeof permissionOptionSchema>

/** A module of related permissions within a Console product or section. */
export const permissionModuleSchema = z.object({
  key: z.string(),
  label: z.string(),
  permissions: z.array(permissionOptionSchema),
})
export type PermissionModule = z.infer<typeof permissionModuleSchema>

/** A Console section or product containing its permission modules. */
export const permissionGroupSchema = z.object({
  key: z.string(),
  label: z.string(),
  modules: z.array(permissionModuleSchema),
})
export type PermissionGroup = z.infer<typeof permissionGroupSchema>
