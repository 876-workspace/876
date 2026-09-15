import { PROJECTS_MODULES } from '@876/core/modules'

/**
 * Product-surface availability for 876 Projects.
 *
 * This is intentionally not the application-module registry. Core owns stable
 * module identity for `projects`, `issues`, and `reports`; this local catalog
 * tracks whether finer UI/permission surfaces exist today. A navigation or
 * permission surface does not become a commercial module just because it has a
 * key (`.claude/rules/module-settings.md`).
 */
export interface ProjectsSurface {
  key: string
  label: string
  description: string
  /** Whether the surface exists today. Planned surfaces carry no href. */
  available: boolean
}

export const PROJECTS_SURFACES: readonly ProjectsSurface[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'The workspace overview.',
    available: true,
  },
  {
    ...PROJECTS_MODULES.projects,
    available: true,
  },
  {
    ...PROJECTS_MODULES.issues,
    available: true,
  },
  {
    key: 'comments',
    label: 'Comments',
    description: 'Discussion on issues.',
    available: true,
  },
  {
    key: 'labels',
    label: 'Labels',
    description: 'Labels shared across the workspace.',
    available: true,
  },
  {
    key: 'members',
    label: 'Members',
    description: 'Who may use 876 Projects in this organization.',
    available: true,
  },
  {
    ...PROJECTS_MODULES.reports,
    available: false,
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Workspace configuration.',
    available: true,
  },
] as const
