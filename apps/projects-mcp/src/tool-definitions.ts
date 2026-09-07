import type { ProjectsOperatorClient } from '@876/projects/operator'
import type { McpServer } from '@modelcontextprotocol/server'

import type { Config } from './config'
import { toolError } from './format'
import {
  handleIssueComment,
  handleIssueComments,
  handleIssueCreate,
  handleIssueEvents,
  handleIssueGet,
  handleIssuesList,
  handleIssueUpdate,
  handleLabelCreate,
  handleLabelsList,
  handleMilestonesList,
  handleProjectCreate,
  handleProjectGet,
  handleProjectsList,
  handleProjectUpdate,
  handleWorkflowStatesList,
  handleWorkItemTypesList,
  handleWorkspaceGet,
} from './handlers'
import {
  issueCommentOutputSchema,
  issueCommentSchema,
  issueCommentsOutputSchema,
  issueCommentsSchema,
  issueCreateOutputSchema,
  issueCreateSchema,
  issueEventsOutputSchema,
  issueEventsSchema,
  issueGetOutputSchema,
  issueGetSchema,
  issuesListOutputSchema,
  issuesListSchema,
  issueUpdateOutputSchema,
  issueUpdateSchema,
  labelCreateOutputSchema,
  labelCreateSchema,
  labelsListOutputSchema,
  labelsListSchema,
  milestonesListOutputSchema,
  milestonesListSchema,
  projectCreateOutputSchema,
  projectCreateSchema,
  projectGetOutputSchema,
  projectGetSchema,
  projectsListOutputSchema,
  projectsListSchema,
  projectUpdateOutputSchema,
  projectUpdateSchema,
  workflowStatesListOutputSchema,
  workflowStatesListSchema,
  workItemTypesListOutputSchema,
  workItemTypesListSchema,
  workspaceGetOutputSchema,
  workspaceGetSchema,
} from './schemas'

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const

const CREATE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const

const UPDATE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const

/**
 * Registers all 876 Projects tools onto the provided v2 McpServer instance.
 */
export function registerProjectTools(
  server: McpServer,
  client: ProjectsOperatorClient,
  config: Config
): void {
  // 1. workspace_get
  server.registerTool(
    'workspace_get',
    {
      description:
        'Retrieve the 876 Projects workspace orientation details for the configured organization. Returns the tenant record and all projects with their key, status, health, lead user, target date, and open-issue count. Open issues are calculated from the organization’s configured workflow-state categories rather than fixed status names. Call this first to discover available project keys.',
      inputSchema: workspaceGetSchema,
      outputSchema: workspaceGetOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleWorkspaceGet(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 2. projects_list
  server.registerTool(
    'projects_list',
    {
      description:
        'List projects in the 876 Projects workspace. Filter by status (planned, active, paused, completed, canceled), lead user ID, free-text search query, or include archived projects. Returns a summary of matching projects.',
      inputSchema: projectsListSchema,
      outputSchema: projectsListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleProjectsList(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 3. project_get
  server.registerTool(
    'project_get',
    {
      description:
        'Retrieve a single project in the 876 Projects workspace by its unique ID or key (e.g. CONSOLE). Returns full project metadata including status, health, lead user, dates, member count, and the optional project-level default work item type.',
      inputSchema: projectGetSchema,
      outputSchema: projectGetOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleProjectGet(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 4. project_create
  server.registerTool(
    'project_create',
    {
      description:
        'Create a new project in the 876 Projects workspace. A project can optionally select one of the organization’s configured work item types as its default for new issues.',
      inputSchema: projectCreateSchema,
      outputSchema: projectCreateOutputSchema,
      annotations: CREATE_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleProjectCreate(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 5. project_update
  server.registerTool(
    'project_update',
    {
      description:
        'Update an existing project in the 876 Projects workspace by ID or key, including its optional project-level default work item type.',
      inputSchema: projectUpdateSchema,
      outputSchema: projectUpdateOutputSchema,
      annotations: UPDATE_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleProjectUpdate(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 6. issues_list
  server.registerTool(
    'issues_list',
    {
      description:
        'List issues in the 876 Projects workspace. Comments often carry the requester’s specification, so retrieve an issue before implementing. Filter by project, configured workflow-state key, priority, assignee, label, or free text. Use workflow_states_list to discover valid status keys.',
      inputSchema: issuesListSchema,
      outputSchema: issuesListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleIssuesList(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 7. issue_get
  server.registerTool(
    'issue_get',
    {
      description:
        'Retrieve a single issue by ID or identifier. Comments are included by default. Returns the configured workflow state, work item type, milestone, custom-field values, labels, timestamps, and activity counts.',
      inputSchema: issueGetSchema,
      outputSchema: issueGetOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleIssueGet(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 8. issue_create
  server.registerTool(
    'issue_create',
    {
      description:
        'Create a new issue using the organization’s configured work structure. Omit status to use the tenant default workflow state; omit typeKey to use the project default work item type and then tenant default. Use workflow_states_list and work_item_types_list before supplying explicit keys.',
      inputSchema: issueCreateSchema,
      outputSchema: issueCreateOutputSchema,
      annotations: CREATE_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleIssueCreate(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 9. issue_update
  server.registerTool(
    'issue_update',
    {
      description:
        'Update an existing issue using configured workflow-state and work-item-type keys. Type changes also prune custom-field values that no longer apply.',
      inputSchema: issueUpdateSchema,
      outputSchema: issueUpdateOutputSchema,
      annotations: UPDATE_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleIssueUpdate(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 10. issue_comment
  server.registerTool(
    'issue_comment',
    {
      description:
        'Add a new comment to an issue. The MCP server must be configured with a default user ID so comment ownership can be recorded and later enforced.',
      inputSchema: issueCommentSchema,
      outputSchema: issueCommentOutputSchema,
      annotations: CREATE_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleIssueComment(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 11. issue_comments
  server.registerTool(
    'issue_comments',
    {
      description:
        'Read an issue comment thread oldest first. Comments carry the requester’s specification and must be read before implementing.',
      inputSchema: issueCommentsSchema,
      outputSchema: issueCommentsOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleIssueComments(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 12. issue_events
  server.registerTool(
    'issue_events',
    {
      description:
        'Retrieve the audit history and activity events for an issue by ID or identifier.',
      inputSchema: issueEventsSchema,
      outputSchema: issueEventsOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleIssueEvents(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 13. labels_list
  server.registerTool(
    'labels_list',
    {
      description:
        'List all issue labels configured in the 876 Projects workspace for this organization.',
      inputSchema: labelsListSchema,
      outputSchema: labelsListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleLabelsList(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 14. label_create
  server.registerTool(
    'label_create',
    {
      description:
        'Create a new issue label in the 876 Projects workspace. Requires a unique label name, with optional hex color code and description.',
      inputSchema: labelCreateSchema,
      outputSchema: labelCreateOutputSchema,
      annotations: CREATE_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleLabelCreate(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 15. work_item_types_list
  server.registerTool(
    'work_item_types_list',
    {
      description:
        'List active work item types configured for the organization. Use returned IDs for project defaults and returned keys for issue typeKey.',
      inputSchema: workItemTypesListSchema,
      outputSchema: workItemTypesListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleWorkItemTypesList(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 16. workflow_states_list
  server.registerTool(
    'workflow_states_list',
    {
      description:
        'List active workflow states configured for the organization. Use returned keys for issue status filters and mutations; do not assume preset status names.',
      inputSchema: workflowStatesListSchema,
      outputSchema: workflowStatesListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleWorkflowStatesList(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )

  // 17. milestones_list
  server.registerTool(
    'milestones_list',
    {
      description:
        'List milestones for one project. Use returned milestone IDs when assigning an issue.',
      inputSchema: milestonesListSchema,
      outputSchema: milestonesListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        return await handleMilestonesList(client, config, args)
      } catch (error) {
        return toolError(
          'internal/tool-error',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  )
}
