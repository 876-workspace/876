import { defineModuleCatalog } from '@876/settings'

/**
 * Organization-controlled CRM functional areas.
 *
 * Keys deliberately reuse CRM permission-catalog module keys, so
 * `<module>.view` / `<module>.edit` already gate each module's settings page.
 *
 * The catalog is a strict subset of the permission catalog, and the omissions
 * below are decisions rather than gaps.
 */
export const CRM_MODULE_KEYS = [
  'requests',
  'tasks',
  'reminders',
  'events',
  'notes',
  'teams',
  'categories',
  'request-forms',
  'reports',
] as const

export type CrmModuleKey = (typeof CRM_MODULE_KEYS)[number]

/** Permission-catalog modules that are deliberately not org-toggleable. */
export const CRM_EXCLUDED_MODULE_KEYS = [
  'calendars',
  'customers',
  'my-work',
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
    key: 'events',
    label: 'Scheduling',
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
    key: 'request-forms',
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
