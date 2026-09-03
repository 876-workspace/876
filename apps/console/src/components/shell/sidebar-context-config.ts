import type { SidebarContextDefinition } from '@/components/shell/sidebar-sections'

/**
 * Contexts that are not represented by `NavEntry.children` yet.
 *
 * Storage proves the shell can change context even before that product has
 * navigation of its own. Keep the declaration empty until Storage is built.
 */
export const sidebarContextDefinitions = [
  {
    key: 'storage-context',
    kind: 'product',
    title: 'Storage',
    href: '/storage',
    parentKey: 'platform',
    entries: [],
  },
] as const satisfies readonly SidebarContextDefinition[]
