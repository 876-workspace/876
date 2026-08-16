'use client'

import {
  OrgSwitcher as OrgSwitcherRoot,
  type OrgSwitcherOrg,
} from '@876/ui/org-switcher'

export function OrgSwitcher({
  current,
  orgs,
}: {
  current: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
}) {
  function handleSelect(org: OrgSwitcherOrg) {
    if (org.id === current.id) return
    window.location.assign('/')
  }

  return (
    <OrgSwitcherRoot current={current} orgs={orgs} onSelect={handleSelect} />
  )
}
