import { defineSettingsNav } from '@876/settings/nav'

/**
 * The complete Couriers settings navigation — every group, every item, written
 * out literally.
 *
 * **This file is hand-maintained on purpose.** To add a settings page, add one
 * object to the relevant group's `items` array below and nothing else. Do not
 * reintroduce generated entries (a `.filter().map()` over the module catalog
 * spread in with `...items`): the point of this file is that the full nav can
 * be read and edited here without opening another module, so an item's title,
 * href, and permission are all visible at the line you are changing.
 *
 * Two conventions the entries follow:
 *
 * - A module-preference item is titled `"<Module> settings"`, never the bare
 *   module label. The bare label collides with the records it governs —
 *   catalog "Warehouse" sat one card away from Organization's "Warehouses",
 *   and "Customer portal" duplicated the Customer portal card outright.
 * - A module-preference item's `href` is `/settings/modules/<key>`, its
 *   `module` is that same `<key>`, and its `permission` is `<key>.view`. The
 *   `<key>` must match a module key in `@/lib/modules` (`COURIERS_MODULE_CATALOG`)
 *   — that is the only coupling left, and it is checked by
 *   `settings-groups.test.ts` rather than by importing the catalog here.
 */
export const SETTINGS_NAV = defineSettingsNav([
  {
    key: 'organization',
    title: 'Organization',
    icon: 'organization',
    items: [
      { title: 'Profile', href: '/settings/orgprofile', status: 'available' },
      { title: 'Branding', href: '/settings/branding', status: 'available' },
      {
        title: 'Locations',
        href: '/settings/locations',
        status: 'available',
      },
      {
        title: 'Warehouses',
        href: '/settings/warehouses',
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
    key: 'modules_core',
    title: 'Core & setup',
    icon: 'modules_core',
    items: [
      { title: 'General', href: '/settings/general', status: 'available' },
      {
        title: 'Customers settings',
        href: '/settings/modules/customers',
        status: 'available',
        permission: 'customers.view',
        module: 'customers',
      },
      {
        title: 'Items settings',
        href: '/settings/modules/items',
        status: 'available',
        permission: 'items.view',
        module: 'items',
      },
      {
        title: 'Packages settings',
        href: '/settings/modules/packages',
        status: 'available',
        permission: 'packages.view',
        module: 'packages',
      },
      {
        title: 'Pre-alerts settings',
        href: '/settings/modules/pre_alerts',
        status: 'available',
        permission: 'pre_alerts.view',
        module: 'pre_alerts',
      },
    ],
  },
  {
    key: 'modules_ops',
    title: 'Operations & fulfillment',
    icon: 'modules_ops',
    items: [
      {
        title: 'Warehouse settings',
        href: '/settings/modules/warehouse',
        status: 'available',
        permission: 'warehouse.view',
        module: 'warehouse',
      },
      {
        title: 'Manifests settings',
        href: '/settings/modules/manifests',
        status: 'available',
        permission: 'manifests.view',
        module: 'manifests',
      },
      {
        title: 'Deliveries settings',
        href: '/settings/modules/deliveries',
        status: 'available',
        permission: 'deliveries.view',
        module: 'deliveries',
      },
      {
        title: 'Invoices settings',
        href: '/settings/modules/invoices',
        status: 'available',
        permission: 'invoices.view',
        module: 'invoices',
      },
      {
        title: 'Payments settings',
        href: '/settings/modules/payments',
        status: 'available',
        permission: 'payments.view',
        module: 'payments',
      },
      {
        title: 'Customer portal settings',
        href: '/settings/modules/portal',
        status: 'available',
        permission: 'portal.view',
        module: 'portal',
      },
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
