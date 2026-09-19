import type { AdminAppStatus } from '@876/platform/compat'

export const APP_STATUSES = [
  'active',
  'inactive',
] as const satisfies readonly AdminAppStatus[]

export function isAppStatus(value: unknown): value is AdminAppStatus {
  return APP_STATUSES.some((status) => status === value)
}

export type AdminOrgStatus = 'active' | 'suspended' | 'archived'

export const ORG_STATUSES = [
  'active',
  'suspended',
  'archived',
] as const satisfies readonly AdminOrgStatus[]

export function isOrgStatus(value: unknown): value is AdminOrgStatus {
  return ORG_STATUSES.some((status) => status === value)
}

export type AdminUserStatus = 'active' | 'inactive' | 'suspended'

export const USER_STATUSES = [
  'active',
  'inactive',
  'suspended',
] as const satisfies readonly AdminUserStatus[]

export function isUserStatus(value: unknown): value is AdminUserStatus {
  return USER_STATUSES.some((status) => status === value)
}
