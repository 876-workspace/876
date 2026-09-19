import type { AdminAppStatus } from '@876/platform/compat'

export const APP_STATUSES = [
  'active',
  'inactive',
] as const satisfies readonly AdminAppStatus[]

export function isAppStatus(value: unknown): value is AdminAppStatus {
  return APP_STATUSES.some((status) => status === value)
}
