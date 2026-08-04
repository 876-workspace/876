import type { AdminAppStatus } from '@876/admin'

export type AppStatusFilterValue = 'all' | AdminAppStatus

/**
 * The Apps list status filter, resolved from the URL.
 *
 * Unlike the other list pages this one defaults to `active` rather than `all`,
 * which is exactly why it lives here: `loading.tsx` has to show the same
 * default the page will, and hardcoding `'all'` there flashed the wrong
 * heading and the wrong checked dropdown option on every navigation.
 */
export function resolveStatusFilter(status?: string): AppStatusFilterValue {
  if (status === 'all' || status === 'inactive') return status
  return 'active'
}
