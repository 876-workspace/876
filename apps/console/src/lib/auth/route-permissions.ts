import 'server-only'

/**
 * The permission each Console route subtree requires, keyed by the subtree's
 * root path. This is the single declaration of layer-2 enforcement, and the
 * anti-drift test binds it to the navigation registry so a nav entry can never
 * hide a section that its route still serves.
 */
export const ROUTE_PERMISSIONS = {
  '/users': 'console:users',
  '/orgs': 'console:organizations',
  '/apps': 'console:apps',
  '/widgets': 'console:widgets',
  '/features': 'console:features',
  '/requests': 'console:requests',
  '/security': 'console:security',
  '/storage': 'console:storage',
  '/reports': 'console:reports',
  '/settings': 'console:settings',
  '/settings/users': 'team:list',
  '/settings/users/roles': 'roles:list',
  '/settings/security': 'console:security',
} as const satisfies Record<string, string>
