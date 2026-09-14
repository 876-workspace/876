import type { NavEntry, NavGroupDefinition } from '@876/core/access'
import {
  contextEntries,
  entryOpensContext as sharedEntryOpensContext,
  resolveActiveEntryKey,
  resolveSidebarBackContext,
  resolveSidebarContextStack as sharedResolveSidebarContextStack,
  sidebarContexts as sharedSidebarContexts,
  type SidebarContext,
  type SidebarContextDefinition,
  type SidebarContextKind,
} from '@876/ui/sidebar-context'

export type {
  SidebarContext,
  SidebarContextDefinition,
  SidebarContextKind,
}
export { contextEntries, resolveActiveEntryKey, resolveSidebarBackContext }

/** The key of Console's root context. */
export const PLATFORM_CONTEXT_KEY = 'platform'

const CONSOLE_CONTEXT_OPTIONS = {
  rootKey: PLATFORM_CONTEXT_KEY,
  rootKind: 'platform',
  rootBackLabel: 'Console',
  // Console intentionally promotes only true section workspaces. Other entries
  // with record-level navigation remain direct links.
  sectionKeys: ['projects', 'requests'],
} as const

export function sidebarContexts(
  navigation: readonly NavGroupDefinition[],
  declared: readonly SidebarContextDefinition[] = []
): SidebarContext[] {
  return sharedSidebarContexts(navigation, declared, CONSOLE_CONTEXT_OPTIONS)
}

export function resolveSidebarContextStack(
  pathname: string,
  navigation: readonly NavGroupDefinition[],
  declared: readonly SidebarContextDefinition[] = []
): SidebarContext[] {
  return sharedResolveSidebarContextStack(
    pathname,
    navigation,
    declared,
    CONSOLE_CONTEXT_OPTIONS
  )
}

export function entryOpensContext(
  entry: NavEntry,
  contexts: readonly SidebarContext[]
): boolean {
  return sharedEntryOpensContext(entry, contexts)
}
