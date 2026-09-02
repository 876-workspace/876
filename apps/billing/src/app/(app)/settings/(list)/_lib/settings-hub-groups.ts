import type { SettingsHubGroup, SettingsHubIconKey } from '@876/ui/settings-hub'

import {
  BILLING_SETTINGS_SECTIONS,
  type getVisibleSettingsSections,
} from '@/components/shell/nav-config'

/**
 * Adapts Billing's permission-filtered settings sections into the shared hub's
 * serializable shape.
 *
 * The navigation catalog owns which sections exist and who may see them; this
 * module owns only how they are grouped and which icon key each one carries.
 * Both maps are keyed by href, and `assertSettingsHubCoverage` proves every
 * declared section appears in both — otherwise adding a settings page would make
 * it silently disappear from the hub while still working in the sidebar.
 */

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

/** The hub route itself is a container, not one of the sections it lists. */
const HUB_HREF = '/settings'

/** Every settings href the navigation catalog declares, minus the hub itself. */
export function declaredSettingsHrefs(): string[] {
  return BILLING_SETTINGS_SECTIONS.map((section) => section.href).filter(
    (href) => href !== HUB_HREF
  )
}

/** Every href this module places in a group. */
export function groupedSettingsHrefs(): string[] {
  return SETTINGS_GROUPS.flatMap((group) => [...group.hrefs])
}

/** Every href this module has an icon key for. */
export function iconKeyedSettingsHrefs(): string[] {
  return Object.keys(SETTINGS_SECTION_ICON_KEYS)
}

export function toSettingsHubGroups(
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
