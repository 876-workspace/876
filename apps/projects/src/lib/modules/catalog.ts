/**
 * The 876 Projects module catalog.
 *
 * A module is a functional area an organization may use. Module state is
 * org-controlled product usage and is stored by the owning app; a feature flag
 * is platform-controlled rollout. They are different layers and must not be
 * conflated (`.claude/rules/module-settings.md`).
 *
 * Keys are canonical kebab-case and must match the permission-catalog module
 * keys, so `<module>.view` / `<module>.edit` can gate each module's settings
 * surface. They are durable persisted identifiers: renaming one is a
 * coordinated migration, never a refactor.
 *
 * This declares the catalog only. No module state, preference override, or
 * provisioning data is stored yet — `available: false` marks a module whose
 * surface is still to be built, so nothing offers a door that opens on nothing.
 */
export interface ProjectsModule {
  key: string
  label: string
  description: string
  /** Whether the module's surface exists today. Planned modules carry no href. */
  available: boolean
}

export const PROJECTS_MODULES: readonly ProjectsModule[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'The workspace overview.',
    available: true,
  },
  {
    key: 'projects',
    label: 'Projects',
    description: 'Projects and their issue key prefixes.',
    available: false,
  },
  {
    key: 'issues',
    label: 'Issues',
    description: 'Issue tracking, status and priority.',
    available: false,
  },
  {
    key: 'comments',
    label: 'Comments',
    description: 'Discussion on issues.',
    available: false,
  },
  {
    key: 'labels',
    label: 'Labels',
    description: 'Labels shared across the workspace.',
    available: false,
  },
  {
    key: 'members',
    label: 'Members',
    description: 'Who may use 876 Projects in this organization.',
    available: true,
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Delivery and throughput reporting.',
    available: false,
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Workspace configuration.',
    available: true,
  },
] as const
