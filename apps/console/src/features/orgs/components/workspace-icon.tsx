import { cn } from '@876/core/utils'

import { NavIcon } from '@/components/shell/nav-icons'
import type { WorkspaceIconKey } from '../app-workspaces'

/**
 * Accent colour per workspace section.
 *
 * The key→component mapping deliberately lives in `NAV_ICONS` and not here: a
 * workspace's sections render in the main sidebar as well as on these cards,
 * and two registries for the same keys drift. Colour is this file's own
 * concern — the rail does not tint section icons.
 */
export const WORKSPACE_ICON_COLORS: Record<WorkspaceIconKey, string> = {
  dashboard: 'text-blue-500 dark:text-blue-400',
  customers: 'text-amber-500 dark:text-amber-400',
  requests: 'text-purple-500 dark:text-purple-400',
  projects: 'text-indigo-500 dark:text-indigo-400',
  issues: 'text-indigo-500 dark:text-indigo-400',
  board: 'text-violet-500 dark:text-violet-400',
  labels: 'text-fuchsia-500 dark:text-fuchsia-400',
  settings: 'text-slate-500 dark:text-slate-400',
  billing: 'text-emerald-500 dark:text-emerald-400',
  packages: 'text-orange-500 dark:text-orange-400',
  items: 'text-emerald-500 dark:text-emerald-400',
  teams: 'text-indigo-500 dark:text-indigo-400',
  categories: 'text-rose-500 dark:text-rose-400',
  forms: 'text-teal-500 dark:text-teal-400',
  payments: 'text-emerald-500 dark:text-emerald-400',
  banking: 'text-sky-500 dark:text-sky-400',
  branches: 'text-cyan-500 dark:text-cyan-400',
  warehouses: 'text-violet-500 dark:text-violet-400',
}

export function WorkspaceIcon({
  iconKey,
  colored = false,
  className,
}: {
  iconKey: WorkspaceIconKey
  colored?: boolean
  className?: string
}) {
  return (
    <NavIcon
      icon={iconKey}
      className={cn(className, colored && WORKSPACE_ICON_COLORS[iconKey])}
    />
  )
}
