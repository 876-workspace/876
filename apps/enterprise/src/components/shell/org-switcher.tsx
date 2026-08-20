'use client'

import { useRouter } from 'next/navigation'

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
  const router = useRouter()

  return (
    <OrgSwitcherRoot
      current={current}
      orgs={orgs}
      onSelect={(org) => router.push(`/${org.slug}`)}
    />
  )
}
