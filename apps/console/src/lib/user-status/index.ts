export type AdminUserStatus = 'active' | 'inactive' | 'suspended'

export const USER_STATUSES = [
  'active',
  'inactive',
  'suspended',
] as const satisfies readonly AdminUserStatus[]

export function isUserStatus(value: unknown): value is AdminUserStatus {
  return USER_STATUSES.some((status) => status === value)
}
