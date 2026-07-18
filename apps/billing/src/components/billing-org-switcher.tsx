'use client'

import { OrgSwitcher, type OrgSwitcherOrg } from '@876/ui/org-switcher'

import { client } from '@/lib/client'

export function BillingOrgSwitcher({
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

  return <OrgSwitcher current={current} orgs={orgs} onSelect={handleSelect} />
}
