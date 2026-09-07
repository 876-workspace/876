import {
  commentSchema,
  issueEventSchema,
  issueOrderSchema,
  issuePrioritySchema,
  issueSchema,
  labelSchema,
  milestoneSchema,
  projectHealthSchema,
  projectSchema,
  projectStatusSchema,
  tenantSchema,
  workflowStateKeySchema,
  workflowStateSchema,
  workItemTypeSchema,
} from '@876/projects/contracts'
import { z } from 'zod'

/**
 * Timestamp schema for optional inputs that can be provided as a Unix second integer
 * or an ISO-8601 string, transformed into Unix seconds.
 */
export const timestampSchema = z
  .union([z.number().int().nonnegative(), z.string().trim().min(1)])
  .optional()
  .describe('Unix timestamp in seconds or an ISO-8601 date string.')
  .transform((val, ctx) => {
    if (val === undefined) return undefined
    if (typeof val === 'number') return val
    if (/^\d+$/.test(val)) return parseInt(val, 10)
    const parsed = Date.parse(val)
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid ISO-8601 date string: ${val}`,
      })
      return z.NEVER
    }
    return Math.floor(parsed / 1000)
  })

/**
 * Nullable timestamp schema for update inputs that can be cleared by passing null.
 */
export const nullableTimestampSchema = z
  .union([z.number().int().nonnegative(), z.string().trim().min(1), z.null()])
  .optional()
  .describe('Unix timestamp in seconds, ISO-8601 date string, or null to clear.')
  .transform((val, ctx) => {
    if (val === undefined) return undefined
    if (val === null) return null
    if (typeof val === 'number') return val
    if (/^\d+$/.test(val)) return parseInt(val, 10)
    const parsed = Date.parse(val)
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid ISO-8601 date string: ${val}`,
      })
      return z.NEVER
    }
    return Math.floor(parsed / 1000)
  })

/**
 * Custom-field value payload input schema.
 */
export const customFieldValueArgsSchema = z
  .object({
    fieldId: z.string().trim().min(1).describe('The configured custom-field ID (cf_...).'),
    value: z
      .union([
        z.string(),
        z.number().int(),
        z.boolean(),
        z.array(z.string().trim().min(1)),
        z.null(),
      ])
      .describe(
        'Typed field value. Use string, integer number, boolean, string array, or null according to the custom-field type.'
      ),
  })
  .strict()

// ============================================================================
// Tool Input Schemas
// ============================================================================

export const workspaceGetSchema = z.object({}).strict()

export const projectsListSchema = z
  .object({
    status: projectStatusSchema
      .optional()
      .describe('Filter projects by status (planned, active, paused, completed, canceled).'),
    lead: z.string().trim().min(1).optional().describe('Filter projects by lead user ID.'),
    q: z.string().trim().min(1).optional().describe('Search query to filter projects by name.'),
    includeArchived: z
      .boolean()
      .optional()
      .describe('Whether to include archived projects in the results (default: false).'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of projects to return (1 to 100, default: 25).'),
  })
  .strict()

export const projectGetSchema = z
  .object({
    project: z
      .string()
      .trim()
      .min(1)
      .describe('The unique ID (prj_...) or key (such as CONSOLE) of the project to retrieve.'),
  })
  .strict()

export const projectCreateSchema = z
  .object({
    name: z.string().trim().min(1).describe('Display name of the project.'),
    key: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Optional uppercase key identifier for the project (e.g. CONSOLE). Auto-generated if omitted.'),
    description: z.string().trim().optional().describe('Optional markdown description of the project.'),
    leadUserId: z.string().trim().min(1).optional().describe('Optional user ID of the project lead.'),
    status: projectStatusSchema
      .optional()
      .describe('Project status (planned, active, paused, completed, canceled; default: planned).'),
    health: projectHealthSchema
      .optional()
      .describe('Project health signal (on-track, at-risk, off-track; default: on-track).'),
    targetDate: timestampSchema.describe(
      'Target completion date as Unix timestamp seconds or ISO-8601 string.'
    ),
    defaultWorkItemTypeId: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .describe(
        'Optional configured work item type ID to use when an issue in this project omits typeKey. Use work_item_types_list to discover valid IDs.'
      ),
  })
  .strict()

export const projectUpdateSchema = z
  .object({
    project: z
      .string()
      .trim()
      .min(1)
      .describe('The unique ID (prj_...) or key (such as CONSOLE) of the project to update.'),
    name: z.string().trim().min(1).optional().describe('New display name of the project.'),
    key: z.string().trim().min(1).optional().describe('New uppercase key identifier for the project.'),
    description: z
      .string()
      .trim()
      .nullable()
      .optional()
      .describe('New description of the project. Pass null to clear.'),
    leadUserId: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .describe('New user ID of the project lead. Pass null to clear.'),
    status: projectStatusSchema
      .optional()
      .describe('New project status (planned, active, paused, completed, canceled).'),
    health: projectHealthSchema
      .optional()
      .describe('New project health signal (on-track, at-risk, off-track).'),
    targetDate: nullableTimestampSchema.describe(
      'New target completion date as Unix timestamp seconds or ISO-8601 string. Pass null to clear.'
    ),
    defaultWorkItemTypeId: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .describe(
        'Configured work item type ID to make the project default. Pass null to clear it; use work_item_types_list to discover valid IDs.'
      ),
  })
  .strict()

export const issuesListSchema = z
  .object({
    project: z.string().trim().min(1).optional().describe('Filter issues by project ID or key (e.g. CONSOLE).'),
    status: z
      .union([workflowStateKeySchema, z.array(workflowStateKeySchema)])
      .optional()
      .describe(
        'Filter by a configured workflow-state key. Also accepts an array of configured state keys. Use workflow_states_list first instead of assuming fixed names.'
      ),
    priority: z
      .union([issuePrioritySchema, z.array(issuePrioritySchema)])
      .optional()
      .describe('Filter by issue priority (none, low, medium, high, urgent). Also accepts an array of priorities.'),
    assignee: z.string().trim().min(1).optional().describe('Filter issues assigned to a specific user ID.'),
    label: z
      .union([z.string().trim().min(1), z.array(z.string().trim().min(1))])
      .optional()
      .describe('Filter issues by label name or ID. Also accepts an array of label names or IDs.'),
    parent: z.string().trim().min(1).optional().describe('Filter sub-issues by parent issue ID or identifier.'),
    q: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Free-text search query matching title, identifier, or description.'),
    updatedSince: timestampSchema.describe(
      'Filter issues updated since a given time (Unix seconds or ISO-8601 date string).'
    ),
    order: issueOrderSchema
      .optional()
      .describe('Sort order for issues (manual, updated, created, priority; default: updated).'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of issues to return (1 to 100, default: 25).'),
  })
  .strict()

export const issueGetSchema = z
  .object({
    issue: z
      .string()
      .trim()
      .min(1)
      .describe('The unique issue ID (iss_...) or human-readable identifier (such as CONSOLE-12).'),
    includeComments: z.boolean().optional().describe('Include the full comment thread (default: true).'),
  })
  .strict()

export const issueCreateSchema = z
  .object({
    title: z.string().trim().min(1).describe('Title of the issue describing the task or bug.'),
    project: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Project ID or key (e.g. CONSOLE) to create the issue in. If omitted, files in Triage.'),
    description: z.string().trim().optional().describe('Markdown description detailing the issue.'),
    status: workflowStateKeySchema
      .optional()
      .describe('Configured workflow-state key. Omit to use the tenant default. Use workflow_states_list to discover valid keys.'),
    typeKey: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'Configured work item type key. Omit to use the project default, then tenant default. Use work_item_types_list to discover valid keys.'
      ),
    milestoneId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Optional milestone ID belonging to the target project. Use milestones_list to discover valid IDs.'),
    customFields: z
      .array(customFieldValueArgsSchema)
      .optional()
      .describe('Configured custom-field values. Required/type-scoped fields are enforced by the Projects API.'),
    priority: issuePrioritySchema
      .optional()
      .describe('Priority level (none, low, medium, high, urgent; default: none).'),
    assigneeUserId: z.string().trim().min(1).optional().describe('User ID assigned to this issue.'),
    parentIssue: z.string().trim().min(1).optional().describe('Parent issue ID or identifier if this is a sub-issue.'),
    estimate: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional()
      .describe('Effort estimate points (integer between 0 and 100).'),
    dueDate: timestampSchema.describe('Due date as Unix timestamp seconds or ISO-8601 string.'),
    labels: z.array(z.string().trim().min(1)).optional().describe('Array of label names or IDs to attach to the issue.'),
  })
  .strict()

export const issueUpdateSchema = z
  .object({
    issue: z
      .string()
      .trim()
      .min(1)
      .describe('The unique issue ID (iss_...) or identifier (such as CONSOLE-12) to update.'),
    title: z.string().trim().min(1).optional().describe('Updated title of the issue.'),
    project: z.string().trim().min(1).optional().describe('Move issue to another project by project ID or key.'),
    description: z
      .string()
      .trim()
      .nullable()
      .optional()
      .describe('Updated markdown description of the issue. Pass null to clear.'),
    status: workflowStateKeySchema
      .optional()
      .describe('Configured workflow-state key. Use workflow_states_list to discover valid keys.'),
    typeKey: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Configured work item type key. Use work_item_types_list to discover valid keys.'),
    milestoneId: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .describe('Milestone ID belonging to the target project. Pass null to clear it.'),
    customFields: z
      .array(customFieldValueArgsSchema)
      .optional()
      .describe(
        'Custom-field changes. Required fields and field applicability are validated against the resulting issue type.'
      ),
    priority: issuePrioritySchema
      .optional()
      .describe('Updated priority level (none, low, medium, high, urgent).'),
    assigneeUserId: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .describe('Updated assignee user ID. Pass null to clear.'),
    parentIssue: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .describe('Updated parent issue ID or identifier. Pass null to clear.'),
    estimate: z
      .number()
      .int()
      .min(0)
      .max(100)
      .nullable()
      .optional()
      .describe('Updated effort estimate points (0 to 100). Pass null to clear.'),
    dueDate: nullableTimestampSchema.describe(
      'Updated due date as Unix timestamp seconds or ISO-8601 string. Pass null to clear.'
    ),
    labels: z
      .array(z.string().trim().min(1))
      .optional()
      .describe('Updated list of label names or IDs to replace existing labels.'),
  })
  .strict()

export const issueCommentSchema = z
  .object({
    issue: z
      .string()
      .trim()
      .min(1)
      .describe('The unique issue ID or identifier (such as CONSOLE-12) to comment on.'),
    body: z.string().trim().min(1).describe('Markdown text content of the comment.'),
  })
  .strict()

export const issueCommentsSchema = z
  .object({
    issue: z.string().trim().min(1).describe('The issue ID or identifier (such as CONSOLE-12).'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum comments to return (1 to 100).'),
  })
  .strict()

export const issueEventsSchema = z
  .object({
    issue: z
      .string()
      .trim()
      .min(1)
      .describe('The unique issue ID or identifier (such as CONSOLE-12) whose activity history to retrieve.'),
  })
  .strict()

export const labelsListSchema = z.object({}).strict()

export const labelCreateSchema = z
  .object({
    name: z.string().trim().min(1).describe('Display name of the new label.'),
    color: z.string().trim().min(1).optional().describe('Optional hex color code for the label (e.g. #3b82f6).'),
    description: z.string().trim().optional().describe('Optional description explaining what this label is used for.'),
  })
  .strict()

export const workItemTypesListSchema = z.object({}).strict()

export const workflowStatesListSchema = z.object({}).strict()

export const milestonesListSchema = z
  .object({
    projectId: z.string().trim().min(1).describe('The unique project ID (prj_...) whose milestones to list.'),
    status: z
      .enum(['open', 'completed', 'canceled'])
      .optional()
      .describe('Optional milestone status filter (open, completed, canceled).'),
  })
  .strict()

// ============================================================================
// Tool Output Schemas
// ============================================================================

export const workspaceGetOutputSchema = z.object({
  tenant: tenantSchema,
  projects: z.array(
    z.object({
      project: projectSchema,
      openIssueCount: z.number().int().nonnegative(),
    })
  ),
})

export const projectsListOutputSchema = z.object({
  projects: z.array(projectSchema),
  totalCount: z.number().int().nullable().optional(),
  hasMore: z.boolean(),
})

export const projectGetOutputSchema = z.object({
  project: projectSchema,
})

export const projectCreateOutputSchema = z.object({
  project: projectSchema,
})

export const projectUpdateOutputSchema = z.object({
  project: projectSchema,
})

export const issuesListOutputSchema = z.object({
  issues: z.array(issueSchema),
  totalCount: z.number().int().nullable().optional(),
  hasMore: z.boolean(),
})

export const issueGetOutputSchema = z.object({
  issue: issueSchema,
  comments: z.array(commentSchema).optional(),
})

export const issueCreateOutputSchema = z.object({
  issue: issueSchema,
})

export const issueUpdateOutputSchema = z.object({
  issue: issueSchema,
})

export const issueCommentOutputSchema = z.object({
  comment: commentSchema,
})

export const issueCommentsOutputSchema = z.object({
  comments: z.array(commentSchema),
})

export const issueEventsOutputSchema = z.object({
  events: z.array(issueEventSchema),
})

export const labelsListOutputSchema = z.object({
  labels: z.array(labelSchema),
})

export const labelCreateOutputSchema = z.object({
  label: labelSchema,
})

export const workItemTypesListOutputSchema = z.object({
  workItemTypes: z.array(workItemTypeSchema),
})

export const workflowStatesListOutputSchema = z.object({
  workflowStates: z.array(workflowStateSchema),
})

export const milestonesListOutputSchema = z.object({
  milestones: z.array(milestoneSchema),
})

// ============================================================================
// Inferred TypeScript Types
// ============================================================================

export type WorkspaceGetArgs = z.infer<typeof workspaceGetSchema>
export type ProjectsListArgs = z.infer<typeof projectsListSchema>
export type ProjectGetArgs = z.infer<typeof projectGetSchema>
export type ProjectCreateArgs = z.infer<typeof projectCreateSchema>
export type ProjectUpdateArgs = z.infer<typeof projectUpdateSchema>
export type IssuesListArgs = z.infer<typeof issuesListSchema>
export type IssueGetArgs = z.infer<typeof issueGetSchema>
export type IssueCreateArgs = z.infer<typeof issueCreateSchema>
export type IssueUpdateArgs = z.infer<typeof issueUpdateSchema>
export type IssueCommentArgs = z.infer<typeof issueCommentSchema>
export type IssueCommentsArgs = z.infer<typeof issueCommentsSchema>
export type IssueEventsArgs = z.infer<typeof issueEventsSchema>
export type LabelsListArgs = z.infer<typeof labelsListSchema>
export type LabelCreateArgs = z.infer<typeof labelCreateSchema>
export type WorkItemTypesListArgs = z.infer<typeof workItemTypesListSchema>
export type WorkflowStatesListArgs = z.infer<typeof workflowStatesListSchema>
export type MilestonesListArgs = z.infer<typeof milestonesListSchema>
