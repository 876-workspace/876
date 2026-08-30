import type { DirectoryMember } from '@/features/directory/types'
import type { CrmTeamMemberRole } from '@/types/crm'

/**
 * A directory member as they appear on a team, carrying the role that
 * membership grants.
 *
 * This lives in the feature rather than beside the table that renders it
 * because the teams list and the team detail page both describe it, and a
 * route may not reach sideways into another route's `_components/`
 * (`.claude/rules/app-structure.md`).
 */
export type TeamMemberRow = DirectoryMember & { role: CrmTeamMemberRole }
