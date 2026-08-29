import { defineModuleCatalog } from '@876/settings'

/**
 * Organization-controlled CRM functional areas.
 * Keys deliberately reuse CRM permission-catalog module keys.
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
