export type AccessAppRole = {
  id: string
  key: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  isDefault: boolean
}

export type AccessPermission = {
  key: string
  moduleKey: string
  moduleLabel: string
  action: string
  label: string
  isDangerous: boolean
}

export type AccessAppEntry = {
  /** Null when the member has not yet been assigned this entitled app. */
  assignmentId: string | null
  appId: string
  appSlug: string
  appName: string
  entitled: boolean
  assigned: boolean
  status: string
  role: AccessAppRole | null
  roles: AccessAppRole[]
  grants: string[]
  denies: string[]
  /** Authoritative effective permissions returned by the owning API. */
  effectivePermissions: string[]
  catalog: AccessPermission[]
}
