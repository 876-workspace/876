import 'server-only'

import { cache } from 'react'

import { $876 } from '@/lib/876'

/** Resolves the CRM tenant Console uses for 876's own support desk. */
export const getPlatformOrganization = cache(async () => {
  const result = await $876.organizations.admin.retrieve({
    slug: process.env.CONSOLE_PLATFORM_ORG_SLUG ?? 'efesto',
  })
  // Never throw. A misconfigured slug is an operator mistake, and it should
  // render an explanatory empty state on this one surface rather than a 500 on
  // whatever nav click happened to reach it first.
  if (result.error) return null

  return result.data
})
