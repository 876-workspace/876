import {
  PLATFORM_CONTEXT_KEY,
  type SidebarContextDefinition,
} from '@/components/shell/sidebar-context'

/**
 * Contexts that are not implied by a platform entry's children.
 *
 * Storage is here to prove the shell can change context before that product has
 * any navigation of its own: the rail swaps, the back control works, and the
 * body is empty until there is something to put in it. Do not delete it to
 * "clean up" — an empty context is a supported state, and this is what pins it.
 * See `.claude/rules/storage-architecture.md`: 876 Drive is deliberately
 * deferred, so there are no Storage screens to link to yet.
 *
 * Product and workspace contexts join this list in Phase 2 and Phase 3.
 */
export const navContexts: readonly SidebarContextDefinition[] = [
  {
    key: 'storage',
    kind: 'product',
    title: 'Storage',
    href: '/storage',
    icon: 'storage',
    colorClassName: 'text-blue-500 dark:text-blue-400',
    activeClassName: 'bg-blue-500/12 ring-blue-500/30',
    parentKey: PLATFORM_CONTEXT_KEY,
    groups: [],
  },
]
