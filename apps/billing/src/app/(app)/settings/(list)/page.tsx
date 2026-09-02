import { Page } from '@876/ui/page'
import {
  SettingsHub,
  type SettingsHubGroup,
  type SettingsHubIconKey,
} from '@876/ui/settings-hub'

import { getVisibleSettingsSections } from '@/components/shell/nav-config'
import { requirePagePermission } from '@/lib/auth/billing-context'

export const metadata = {
  title: 'Settings',
  description: 'Billing workspace settings.',
}

const SETTINGS_SECTION_ICON_KEYS: Record<string, SettingsHubIconKey> = {
  '/settings/compliance/currencies': 'currencies',
  '/settings/payment-modes': 'payments',
  '/settings/billing': 'documents',
  '/settings/subscriptions': 'templates',
  '/settings/discounts': 'items',
  '/settings/payment-providers': 'integrations',
  '/settings/accounting-providers': 'integrations',
  '/settings/users': 'members',
  '/settings/roles': 'roles',
}

const SETTINGS_GROUPS = [
  {
    label: 'Compliance',
    hrefs: ['/settings/compliance/currencies'],
  },
  {
    label: 'Money',
    hrefs: [
      '/settings/payment-modes',
      '/settings/billing',
      '/settings/subscriptions',
      '/settings/discounts',
    ],
  },
  {
    label: 'Integrations',
    hrefs: ['/settings/payment-providers', '/settings/accounting-providers'],
  },
  {
    label: 'Access',
    hrefs: ['/settings/users', '/settings/roles'],
  },
] as const

function toSettingsHubGroups(
  sections: ReturnType<typeof getVisibleSettingsSections>
): SettingsHubGroup[] {
  const sectionsByHref = new Map(
    sections.map((section) => [section.href, section])
  )

  return SETTINGS_GROUPS.map(({ label, hrefs }) => ({
    label,
    items: hrefs.flatMap((href) => {
      const section = sectionsByHref.get(href)
      if (!section) return []

      return [
        {
          label: section.title,
          icon: SETTINGS_SECTION_ICON_KEYS[href],
          availability: 'available' as const,
          href: section.href,
        },
      ]
    }),
  })).filter((group) => group.items.length > 0)
}

export default async function SettingsPage() {
  const context = await requirePagePermission('settings:read')
  const sections = getVisibleSettingsSections(context.permissions)
  const groups = toSettingsHubGroups(sections)

  return (
    <Page hub>
      <div className="mb-6">
        <h1 className="876-page-title">Settings</h1>
      </div>
      <SettingsHub groups={groups} />
    </Page>
  )
}
