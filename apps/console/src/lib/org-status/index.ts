export type AdminOrgStatus = 'active' | 'suspended' | 'archived'

export const ORG_STATUSES = [
  'active',
  'suspended',
  'archived',
] as const satisfies readonly AdminOrgStatus[]

export function isOrgStatus(value: unknown): value is AdminOrgStatus {
  return ORG_STATUSES.some((status) => status === value)
}
