import type { Permission } from './access'

export interface PermissionOption {
  value: Permission
  label: string
  description: string
}

export interface PermissionGroup {
  label: string
  permissions: PermissionOption[]
}
