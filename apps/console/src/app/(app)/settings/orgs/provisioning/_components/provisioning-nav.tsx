import { RouteTabs, type RouteTabItem } from '@876/ui/route-tabs'

const TABS: RouteTabItem[] = [
  {
    label: 'Setups',
    href: '/settings/orgs/provisioning',
    exact: true,
  },
  {
    label: 'Run history',
    href: '/settings/orgs/provisioning/runs',
  },
]

export function ProvisioningNav() {
  return <RouteTabs tabs={TABS} />
}
