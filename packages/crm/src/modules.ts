import { defineModuleCatalog } from '@876/settings'

/**
 * Organization-controlled CRM functional areas.
 *
 * Keys deliberately reuse CRM permission-catalog module keys, so
 * `<module>.view` / `<module>.edit` already gate each module's settings page.
 *
 * The catalog is a strict subset of the permission catalog, and the three
 * omissions are decisions rather than gaps:
 *
 * - `customers` is the shared org-customer registry, not a CRM-owned area an
 *   organization can switch off (`.claude/rules/customer-architecture.md`).
 * - `priorities` is structural: every request carries a non-null priority, so
 *   there is no working CRM with priorities disabled.
 * - `settings` is where modules are toggled; it cannot toggle itself.
 *
 * `CRM_EXCLUDED_MODULE_KEYS` records that, and `modules.test.ts` fails if a
 * permission module ever appears in neither list.
 */
export const CRM_MODULE_KEYS = [
  'requests',
  'tasks',
  'reminders',
  'notes',
  'teams',
  'categories',
  'request_forms',
  'reports',
] as const

export type CrmModuleKey = (typeof CRM_MODULE_KEYS)[number]

/** Permission-catalog modules that are deliberately not org-toggleable. */
export const CRM_EXCLUDED_MODULE_KEYS = [
  'customers',
  'priorities',
  'settings',
] as const

export const crmModuleCatalog = defineModuleCatalog([
  {
    key: 'requests',
    label: 'Requests',
    optional: false,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'tasks',
    label: 'Tasks',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'reminders',
    label: 'Reminders',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'notes',
    label: 'Notes',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'teams',
    label: 'Teams',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'categories',
    label: 'Categories',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'request_forms',
    label: 'Request forms',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'reports',
    label: 'Reports',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
])
