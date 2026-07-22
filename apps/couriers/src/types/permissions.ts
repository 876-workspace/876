export type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

export interface PermissionExtra {
  /** Key segment after the module, e.g. 'export' in 'customers.export'. */
  key: string
  label: string
}

export interface PermissionModule {
  /** snake_case module key — the prefix of every permission in the module. */
  key: string
  label: string
  /** Standard actions this module supports, in matrix column order. */
  actions: PermissionAction[]
  /** Module-specific "other" permissions (Zoho-style more-permissions). */
  extras: PermissionExtra[]
}

export type PermissionCatalog = PermissionModule[]

export type DefaultRoleKey = 'admin' | 'staff'
