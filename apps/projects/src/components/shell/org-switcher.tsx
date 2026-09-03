'use client'

import {
  OrgSwitcher as OrgSwitcherRoot,
  type OrgSwitcherOrg,
} from '@876/ui/org-switcher'

import { request } from '@/lib/client/request'

export function OrgSwitcher({
  current,
  orgs,
}: {
  current: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
}) {
  async function handleSelect(org: OrgSwitcherOrg) {
    if (org.id === current.id) return

    const result = await request<{ ok: boolean }>('/api/auth/switch-org', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ organizationId: org.id }),
    })

    if (result.error) {
      console.error('[crm.switch_org.failed]', result.error)
      return
    }

    window.location.assign('/')
  }

  return (
    <OrgSwitcherRoot current={current} orgs={orgs} onSelect={handleSelect} />
  )
}
