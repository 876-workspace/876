'use client'

import {
  OrgSwitcher as OrgSwitcherRoot,
  type OrgSwitcherOrg,
} from '@876/ui/org-switcher'

import { client } from '@/lib/client'

export function OrgSwitcher({
  current,
  orgs,
}: {
  current: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
}) {
  async function handleSelect(org: OrgSwitcherOrg) {
    const result = await client.auth.switchOrganization({
      organizationId: org.id,
    })
    if (result.error) {
      console.error('[billing.switch_org.failed]', result.error)
      return
    }

    window.location.assign('/')
  }

  return (
    <OrgSwitcherRoot current={current} orgs={orgs} onSelect={handleSelect} />
  )
}
