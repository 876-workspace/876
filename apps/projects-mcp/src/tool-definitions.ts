import type { ProjectsOperatorClient } from '@876/projects/operator'
import type { McpServer } from '@modelcontextprotocol/server'

import type { Config } from './config'
import { toolError, type ToolResult } from './format'
import {
  handleActivityList,
  handleCustomModulesList,
  handleCustomRecordGet,
  handleCustomRecordsList,
  handleCycleGet,
  handleCyclesList,
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
  handlePhaseGet,
  handlePhasesList,
  handleProjectCreate,
  handleProjectGet,
  handleProjectsList,
  handleProjectUpdate,
  handleReportBudgetVariance,
  handleReportHealth,
  handleReportTime,
  handleReportWork,
  handleReportWorkload,
  handleTaskListsList,
  handleTemplateGet,
  handleTemplatesList,
  handleTimeEntriesList,
  handleTimeEntryCreate,
  handleTimeSummary,
  handleWikiPageGet,
  handleWorkflowStatesList,
  handleWorkItemTypesList,
  handleWorkspaceGet,
} from './handlers'
import {
  activityListOutputSchema,
  activityListSchema,
  customModulesListOutputSchema,
  customModulesListSchema,
  customRecordGetOutputSchema,
  customRecordGetSchema,
  customRecordsListOutputSchema,
  customRecordsListSchema,
  cycleGetOutputSchema,
  cycleGetSchema,
  cyclesListOutputSchema,
  cyclesListSchema,
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
  phaseGetOutputSchema,
  phaseGetSchema,
  phasesListOutputSchema,
  phasesListSchema,
  projectCreateOutputSchema,
  projectCreateSchema,
  projectGetOutputSchema,
  projectGetSchema,
  projectsListOutputSchema,
  projectsListSchema,
  projectUpdateOutputSchema,
  projectUpdateSchema,
  reportBudgetVarianceOutputSchema,
  reportBudgetVarianceSchema,
  reportHealthOutputSchema,
  reportHealthSchema,
  reportTimeOutputSchema,
  reportTimeSchema,
  reportWorkloadOutputSchema,
  reportWorkloadSchema,
  reportWorkOutputSchema,
  reportWorkSchema,
  taskListsListOutputSchema,
  taskListsListSchema,
  templateGetOutputSchema,
  templateGetSchema,
  templatesListOutputSchema,
  templatesListSchema,
  timeEntriesListOutputSchema,
  timeEntriesListSchema,
  timeEntryCreateOutputSchema,
  timeEntryCreateSchema,
  timeSummaryOutputSchema,
  timeSummaryQuerySchema,
  wikiPageGetOutputSchema,
  wikiPageGetSchema,
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
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const

function withToolErrorBoundary<Args>(
  handler: (args: Args) => Promise<ToolResult>
): (args: Args) => Promise<ToolResult> {
  return async (args) => {
    try {
      return await handler(args)
    } catch (error) {
      return toolError(
        'internal/tool-error',
        error instanceof Error ? error.message : String(error)
      )
    }
  }
}

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
    withToolErrorBoundary((args) => handleWorkspaceGet(client, config, args))
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
    withToolErrorBoundary((args) => handleProjectsList(client, config, args))
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
    withToolErrorBoundary((args) => handleProjectGet(client, config, args))
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
    withToolErrorBoundary((args) => handleProjectCreate(client, config, args))
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
    withToolErrorBoundary((args) => handleProjectUpdate(client, config, args))
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
    withToolErrorBoundary((args) => handleIssuesList(client, config, args))
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
    withToolErrorBoundary((args) => handleIssueGet(client, config, args))
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
    withToolErrorBoundary((args) => handleIssueCreate(client, config, args))
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
    withToolErrorBoundary((args) => handleIssueUpdate(client, config, args))
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
    withToolErrorBoundary((args) => handleIssueComment(client, config, args))
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
    withToolErrorBoundary((args) => handleIssueComments(client, config, args))
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
    withToolErrorBoundary((args) => handleIssueEvents(client, config, args))
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
    withToolErrorBoundary((args) => handleLabelsList(client, config, args))
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
    withToolErrorBoundary((args) => handleLabelCreate(client, config, args))
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
    withToolErrorBoundary((args) =>
      handleWorkItemTypesList(client, config, args)
    )
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
    withToolErrorBoundary((args) =>
      handleWorkflowStatesList(client, config, args)
    )
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
    withToolErrorBoundary((args) => handleMilestonesList(client, config, args))
  )

  // 18. phases_list
  server.registerTool(
    'phases_list',
    {
      description:
        'List project phases (milestones) with optional project and status filters. Omit projectId to list across the organization.',
      inputSchema: phasesListSchema,
      outputSchema: phasesListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handlePhasesList(client, config, args))
  )

  // 19. phase_get
  server.registerTool(
    'phase_get',
    {
      description: 'Retrieve one project phase (milestone) by ID.',
      inputSchema: phaseGetSchema,
      outputSchema: phaseGetOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handlePhaseGet(client, config, args))
  )

  // 20. cycles_list
  server.registerTool(
    'cycles_list',
    {
      description:
        'List cycles with optional project and status filters. Omit filters to list across the organization.',
      inputSchema: cyclesListSchema,
      outputSchema: cyclesListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleCyclesList(client, config, args))
  )

  // 21. cycle_get
  server.registerTool(
    'cycle_get',
    {
      description: 'Retrieve one cycle by ID with progress and throughput.',
      inputSchema: cycleGetSchema,
      outputSchema: cycleGetOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleCycleGet(client, config, args))
  )

  // 22. task_lists_list
  server.registerTool(
    'task_lists_list',
    {
      description:
        'List task lists for one project with progress and ownership.',
      inputSchema: taskListsListSchema,
      outputSchema: taskListsListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleTaskListsList(client, config, args))
  )

  // 23. time_entries_list
  server.registerTool(
    'time_entries_list',
    {
      description:
        'List time entries filtered by user, project, issue, window, billable flag, or approval status.',
      inputSchema: timeEntriesListSchema,
      outputSchema: timeEntriesListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) =>
      handleTimeEntriesList(client, config, args)
    )
  )

  // 24. time_summary
  server.registerTool(
    'time_summary',
    {
      description:
        'Summarize logged time totals grouped by project, user, issue, or day for a window.',
      inputSchema: timeSummaryQuerySchema,
      outputSchema: timeSummaryOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleTimeSummary(client, config, args))
  )

  // 25. report_work
  server.registerTool(
    'report_work',
    {
      description:
        'Read the work report for a window with counts by state, type, assignee, overdue, and total.',
      inputSchema: reportWorkSchema,
      outputSchema: reportWorkOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleReportWork(client, config, args))
  )

  // 26. report_health
  server.registerTool(
    'report_health',
    {
      description:
        'Read the project health report with progress, open items, overdue, and budget consumption per project.',
      inputSchema: reportHealthSchema,
      outputSchema: reportHealthOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleReportHealth(client, config, args))
  )

  // 27. report_time
  server.registerTool(
    'report_time',
    {
      description:
        'Read the time report for a window grouped by project, user, or issue with billable splits.',
      inputSchema: reportTimeSchema,
      outputSchema: reportTimeOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleReportTime(client, config, args))
  )

  // 28. report_budget_variance
  server.registerTool(
    'report_budget_variance',
    {
      description:
        'Read the budget variance report for a window with budgeted versus actual minutes per project.',
      inputSchema: reportBudgetVarianceSchema,
      outputSchema: reportBudgetVarianceOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) =>
      handleReportBudgetVariance(client, config, args)
    )
  )

  // 29. report_workload
  server.registerTool(
    'report_workload',
    {
      description:
        'Read the workload report for a window with assigned, planned, logged, and capacity minutes per member.',
      inputSchema: reportWorkloadSchema,
      outputSchema: reportWorkloadOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleReportWorkload(client, config, args))
  )

  // 30. templates_list
  server.registerTool(
    'templates_list',
    {
      description: 'List project templates available for new projects.',
      inputSchema: templatesListSchema,
      outputSchema: templatesListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleTemplatesList(client, config, args))
  )

  // 31. template_get
  server.registerTool(
    'template_get',
    {
      description: 'Retrieve one project template by ID with version and counts.',
      inputSchema: templateGetSchema,
      outputSchema: templateGetOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleTemplateGet(client, config, args))
  )

  // 32. custom_modules_list
  server.registerTool(
    'custom_modules_list',
    {
      description: 'List custom modules configured in the workspace.',
      inputSchema: customModulesListSchema,
      outputSchema: customModulesListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) =>
      handleCustomModulesList(client, config, args)
    )
  )

  // 33. custom_records_list
  server.registerTool(
    'custom_records_list',
    {
      description:
        'List records in one custom module with optional status, project, search, and field filters.',
      inputSchema: customRecordsListSchema,
      outputSchema: customRecordsListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) =>
      handleCustomRecordsList(client, config, args)
    )
  )

  // 34. custom_record_get
  server.registerTool(
    'custom_record_get',
    {
      description: 'Retrieve one custom module record by module and record ID.',
      inputSchema: customRecordGetSchema,
      outputSchema: customRecordGetOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) =>
      handleCustomRecordGet(client, config, args)
    )
  )

  // 35. activity_list
  server.registerTool(
    'activity_list',
    {
      description:
        'List recent project activity oldest or newest first with cursor pagination.',
      inputSchema: activityListSchema,
      outputSchema: activityListOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleActivityList(client, config, args))
  )

  // 36. wiki_page_get
  server.registerTool(
    'wiki_page_get',
    {
      description: 'Retrieve one wiki page by project and slug or ID.',
      inputSchema: wikiPageGetSchema,
      outputSchema: wikiPageGetOutputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withToolErrorBoundary((args) => handleWikiPageGet(client, config, args))
  )

  // 37. time_entry_create
  server.registerTool(
    'time_entry_create',
    {
      description:
        'Log a time entry for a project with start, end, and optional issue, milestone, or note. Requires the projects:write scope.',
      inputSchema: timeEntryCreateSchema,
      outputSchema: timeEntryCreateOutputSchema,
      annotations: CREATE_ANNOTATIONS,
    },
    withToolErrorBoundary((args) =>
      handleTimeEntryCreate(client, config, args)
    )
  )
}
