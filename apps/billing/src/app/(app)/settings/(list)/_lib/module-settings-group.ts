import type { SettingsHubGroup } from '@876/ui/settings-hub'

import { BILLING_MODULE_CATALOG } from '@/lib/modules'

export const BILLING_MODULE_SETTINGS_GROUP: SettingsHubGroup = {
  label: 'Modules',
  items: BILLING_MODULE_CATALOG.map((module) => ({
    label: `${module.label} settings`,
    icon: 'preferences',
    availability: 'available' as const,
    href: `/settings/modules/${module.key}`,
  })),
}
