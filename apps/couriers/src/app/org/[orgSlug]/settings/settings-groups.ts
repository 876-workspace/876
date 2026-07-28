import { defineSettingsNav } from '@876/settings/nav'
import type { SettingsNavItem } from '@876/settings/types'

import { COURIERS_MODULE_CATALOG } from '@/lib/modules'

/**
 * Preference pages for every module in the catalog, so the settings menu and the
 * module catalog cannot drift. Each one renders through the shared
 * `/settings/modules/[moduleKey]` route rather than a hand-written page.
 *
 * `general` is excluded here and listed first by hand, because it is app-wide
 * rather than a feature area an org would think of as a module.
 */
const modulePreferenceItems: SettingsNavItem[] = COURIERS_MODULE_CATALOG.filter(
  (module) => module.key !== 'general'
).map((module) => ({
  title: module.label,
  href: `/settings/modules/${module.key}`,
  status: 'available',
  permission: `${module.key}.view`,
  module: module.key,
}))

export const SETTINGS_NAV = defineSettingsNav([
  {
    key: 'organization',
    title: 'Organization',
    icon: 'organization',
    items: [
      { title: 'Profile', href: '/settings/orgprofile', status: 'available' },
      { title: 'Branding', href: '/settings/branding', status: 'available' },
      {
        title: 'Locations & branches',
        href: '/settings/branches',
        status: 'available',
      },
      { title: 'Custom domain', href: '/settings/domain', status: 'available' },
      {
        title: 'Manage subscription',
        href: '/settings/subscription',
        status: 'available',
      },
    ],
  },
  {
    key: 'users',
    title: 'Users & roles',
    icon: 'users',
    items: [
      {
        title: 'Users',
        href: '/settings/users',
        status: 'available',
        permission: 'settings.view',
      },
      {
        title: 'Roles',
        href: '/settings/users/roles',
        status: 'available',
        permission: 'settings.view',
      },
    ],
  },
  {
    key: 'modules',
    title: 'Modules',
    icon: 'modules',
    items: [
      { title: 'General', href: '/settings/general', status: 'available' },
      ...modulePreferenceItems,
    ],
  },
  {
    key: 'portal',
    title: 'Customer portal',
    icon: 'portal',
    items: [
      {
        title: 'Portal settings',
        href: '/settings/portal',
        status: 'available',
      },
      {
        title: 'Portal branding',
        href: '/settings/portal/branding',
        status: 'available',
      },
      {
        title: 'Sign-up & access',
        href: '/settings/portal/access',
        status: 'available',
      },
    ],
  },
  {
    key: 'rates',
    title: 'Rates & taxes',
    icon: 'rates',
    items: [
      { title: 'Rate cards', href: '/settings/rates', status: 'available' },
      {
        title: 'Duties & customs',
        href: '/settings/rates/customs',
        status: 'available',
      },
      { title: 'Taxes', href: '/settings/rates/taxes', status: 'available' },
      {
        title: 'Currencies',
        href: '/settings/rates/currencies',
        status: 'available',
      },
    ],
  },
  {
    key: 'customization',
    title: 'Customization',
    icon: 'customization',
    items: [
      {
        title: 'Custom fields',
        href: '/settings/customization/fields',
        status: 'available',
      },
      {
        title: 'Package categories',
        href: '/settings/customization/package-categories',
        status: 'available',
      },
      {
        title: 'Customer ID types',
        href: '/settings/customization/customer-id-types',
        status: 'available',
      },
      {
        title: 'Address format',
        href: '/settings/customization/address-format',
        status: 'available',
      },
    ],
  },
  {
    key: 'communication',
    title: 'Communication',
    icon: 'communication',
    items: [
      {
        title: 'Email templates',
        href: '/settings/communication/templates',
        status: 'available',
      },
      {
        title: 'Notifications',
        href: '/settings/notifications',
        status: 'available',
      },
      {
        title: 'Reminders',
        href: '/settings/communication/reminders',
        status: 'available',
      },
    ],
  },
  {
    key: 'automation',
    title: 'Automation & developer',
    icon: 'automation',
    items: [
      {
        title: 'Workflow rules',
        href: '/settings/automation/rules',
        status: 'available',
      },
      {
        title: 'Integrations',
        href: '/settings/integrations',
        status: 'available',
      },
      {
        title: 'Webhooks',
        href: '/settings/developer/webhooks',
        status: 'available',
      },
      {
        title: 'API keys',
        href: '/settings/developer/api-keys',
        status: 'available',
      },
    ],
  },
  {
    key: 'billing',
    title: 'Billing',
    icon: 'billing',
    items: [
      { title: 'Billing', href: '/settings/billing', status: 'available' },
    ],
  },
])
