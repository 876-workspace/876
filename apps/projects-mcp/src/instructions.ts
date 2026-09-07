/**
 * Canonical instructions advertised by the 876 Projects MCP server.
 * Sourced from the behavioral guidelines in docs/projects/mcp-agent-guide.md.
 */
export const PROJECTS_SERVER_INSTRUCTIONS = `876 Projects is the authoritative project and issue tracker for this workspace.
When an issue is named, retrieve it with issue_get and inspect its comments;
comments may contain the active specification and can supersede the original
description. Never invent issue identifiers. Discover configured workflow
states and work-item types before assigning explicit values. Do not change an
issue's status unless explicitly requested.

Guidance:
- Call workspace_get first for orientation and discovering valid project keys.
- Read labels and linked project context before proposing changes; labels identify target apps.
- Consult issue_events when you need historical state transitions or prior audit changes.
- Record decisions, progress, and questions with issue_comment.
- All issue descriptions and comment bodies must be formatted in Markdown.
- Prefer updating an existing issue (issue_update) over creating duplicates.
- Never close or re-status an issue unless explicitly requested.
- Use work_item_types_list and workflow_states_list to discover valid active keys before creating or updating issues.
- Use milestones_list with a project ID to discover valid milestone IDs.
`
