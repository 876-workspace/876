export interface AppPermission {
  key: string
  moduleKey: string
  action: string
  label: string
  description?: string | null
  isDangerous?: boolean
  position?: number
}

export interface AppRole {
  id?: string
  appId?: string
  organizationId?: string | null
  key: string
  name: string
  description?: string | null
  permissions: string[]
  isSystem?: boolean
  isDefault?: boolean
  templateKey?: string | null
  position?: number
}

export interface AppMembershipProfile {
  id: string
  organizationId: string
  userId: string
  membershipId: string
  appId: string
  appSlug: string
  appName: string
  status: string
  assigned: boolean
  entitled: boolean
  appRole: AppRole | null
  permissionGrants: string[]
  permissionDenies: string[]
  effectivePermissions: string[]
  title: string | null
  attributes: unknown | null
  assignedBy: string | null
  assignedAt: number | null
  lastAccessAt: number | null
  revokedAt: number | null
  createdAt: number | null
  updatedAt: number | null
}

export interface AppPermissionDefinition {
  action: string
  label: string
  description?: string
  isDangerous?: boolean
  position?: number
}

export interface AppPermissionModuleDefinition {
  key: string
  label: string
  permissions: readonly AppPermissionDefinition[]
  position?: number
}

export interface AppPermissionCatalogDefinition {
  app: string
  modules: readonly AppPermissionModuleDefinition[]
}

export interface AppPermissionCatalogModule {
  key: string
  label: string
  position: number
  permissions: AppPermission[]
}

export interface AppPermissionCatalog {
  app: string
  modules: AppPermissionCatalogModule[]
  permissions: AppPermission[]
}

export interface EffectivePermissionInput {
  role: Pick<AppRole, 'permissions'> | null | undefined
  grants?: readonly string[] | null
  denies?: readonly string[] | null
  catalog: AppPermissionCatalog | readonly AppPermission[]
}

export interface GroupedAppPermissions {
  key: string
  label: string
  position: number
  permissions: Array<AppPermission & { granted: boolean }>
}
