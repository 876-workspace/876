export interface ToolPropertySchema {
  type?: string
  description: string
  enum?: readonly string[]
  items?: {
    type: string
  }
}

export interface ToolInputSchema {
  type: 'object'
  properties: Record<string, ToolPropertySchema>
  required?: readonly string[]
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: ToolInputSchema
}

export const TOOLS: readonly ToolDefinition[] = [
  {
    name: 'workspace_get',
    description:
      'Retrieve the 876 Projects workspace orientation details for the configured organization. Returns the tenant record and all projects with their key, status, health, lead user, target date, and open-issue count. Call this first to discover available project keys.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'projects_list',
    description:
      'List projects in the 876 Projects workspace. Filter by status (planned, active, paused, completed, canceled), lead user ID, free-text search query, or include archived projects. Returns a summary of matching projects.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description:
            'Filter projects by status (planned, active, paused, completed, canceled).',
          enum: ['planned', 'active', 'paused', 'completed', 'canceled'],
        },
        lead: {
          type: 'string',
          description: 'Filter projects by lead user ID.',
        },
        q: {
          type: 'string',
          description: 'Search query to filter projects by name.',
        },
        includeArchived: {
          type: 'boolean',
          description:
            'Whether to include archived projects in the results (default: false).',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of projects to return (1 to 100, default: 25).',
        },
      },
    },
  },
  {
    name: 'project_get',
    description:
      'Retrieve a single project in the 876 Projects workspace by its unique ID or key (e.g. CONSOLE). Returns full project metadata including status, health, lead user, dates, and member count.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'The unique ID (prj_...) or key (such as CONSOLE) of the project to retrieve.',
        },
      },
      required: ['project'],
    },
  },
  {
    name: 'project_create',
    description:
      'Create a new project in the 876 Projects workspace. Provide name and optional key, description, lead user ID, status, health, and target date. Returns the newly created project record.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Display name of the project.',
        },
        key: {
          type: 'string',
          description:
            'Optional uppercase key identifier for the project (e.g. CONSOLE). Auto-generated if omitted.',
        },
        description: {
          type: 'string',
          description: 'Optional markdown description of the project.',
        },
        leadUserId: {
          type: 'string',
          description: 'Optional user ID of the project lead.',
        },
        status: {
          type: 'string',
          description:
            'Project status (planned, active, paused, completed, canceled; default: planned).',
          enum: ['planned', 'active', 'paused', 'completed', 'canceled'],
        },
        health: {
          type: 'string',
          description:
            'Project health signal (on-track, at-risk, off-track; default: on-track).',
          enum: ['on-track', 'at-risk', 'off-track'],
        },
        targetDate: {
          type: 'string',
          description:
            'Target completion date as Unix timestamp seconds or ISO-8601 string.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'project_update',
    description:
      'Update an existing project in the 876 Projects workspace by ID or key. Update name, key, description, lead user ID, status, health, or target date. Returns the updated project record.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'The unique ID (prj_...) or key (such as CONSOLE) of the project to update.',
        },
        name: {
          type: 'string',
          description: 'New display name of the project.',
        },
        key: {
          type: 'string',
          description: 'New uppercase key identifier for the project.',
        },
        description: {
          type: 'string',
          description: 'New description of the project.',
        },
        leadUserId: {
          type: 'string',
          description: 'New user ID of the project lead.',
        },
        status: {
          type: 'string',
          description:
            'New project status (planned, active, paused, completed, canceled).',
          enum: ['planned', 'active', 'paused', 'completed', 'canceled'],
        },
        health: {
          type: 'string',
          description:
            'New project health signal (on-track, at-risk, off-track).',
          enum: ['on-track', 'at-risk', 'off-track'],
        },
        targetDate: {
          type: 'string',
          description:
            'New target completion date as Unix timestamp seconds or ISO-8601 string.',
        },
      },
      required: ['project'],
    },
  },
  {
    name: 'issues_list',
    description:
      'List issues in the 876 Projects workspace. Comments often carry the requester’s specification, so retrieve an issue before implementing. Filter by project (id or key such as CONSOLE), status, priority, assignee, label, or free text. Use updatedSince to fetch only what changed since a given time — that is the cheap way to catch up. Returns at most 100 issues, most recently updated first.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Filter issues by project ID or key (e.g. CONSOLE).',
        },
        status: {
          type: 'string',
          description:
            'Filter by issue status (backlog, todo, in-progress, in-review, done, canceled). Also accepts an array of statuses.',
          enum: [
            'backlog',
            'todo',
            'in-progress',
            'in-review',
            'done',
            'canceled',
          ],
        },
        priority: {
          type: 'string',
          description:
            'Filter by issue priority (none, low, medium, high, urgent). Also accepts an array of priorities.',
          enum: ['none', 'low', 'medium', 'high', 'urgent'],
        },
        assignee: {
          type: 'string',
          description: 'Filter issues assigned to a specific user ID.',
        },
        label: {
          type: 'string',
          description: 'Filter issues by label name or ID.',
        },
        parent: {
          type: 'string',
          description: 'Filter sub-issues by parent issue ID or identifier.',
        },
        q: {
          type: 'string',
          description:
            'Free-text search query matching title, identifier, or description.',
        },
        updatedSince: {
          type: 'string',
          description:
            'Filter issues updated since a given time (Unix seconds or ISO-8601 date string).',
        },
        order: {
          type: 'string',
          description:
            'Sort order for issues (manual, updated, created, priority; default: updated).',
          enum: ['manual', 'updated', 'created', 'priority'],
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of issues to return (1 to 100, default: 25).',
        },
      },
    },
  },
  {
    name: 'issue_get',
    description:
      'Retrieve a single issue in the 876 Projects workspace by its unique ID or identifier (such as CONSOLE-12). Comments carry the requester’s own specification and must be read before implementing; they are included by default. Returns full issue details including status, priority, labels, timestamps, and comment count.',
    inputSchema: {
      type: 'object',
      properties: {
        issue: {
          type: 'string',
          description:
            'The unique issue ID (iss_...) or human-readable identifier (such as CONSOLE-12).',
        },
        includeComments: {
          type: 'boolean',
          description: 'Include the full comment thread (default: true).',
        },
      },
      required: ['issue'],
    },
  },
  {
    name: 'issue_create',
    description:
      'Create a new issue in the 876 Projects workspace. Provide title and optional project (key or id; omitting project files it in Triage), description, status, priority, assignee, parent issue, estimate, due date, and labels. Returns the created issue.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the issue describing the task or bug.',
        },
        project: {
          type: 'string',
          description:
            'Project ID or key (e.g. CONSOLE) to create the issue in. If omitted, files in Triage.',
        },
        description: {
          type: 'string',
          description: 'Markdown description detailing the issue.',
        },
        status: {
          type: 'string',
          description:
            'Initial status (backlog, todo, in-progress, in-review, done, canceled; default: todo).',
          enum: [
            'backlog',
            'todo',
            'in-progress',
            'in-review',
            'done',
            'canceled',
          ],
        },
        priority: {
          type: 'string',
          description:
            'Priority level (none, low, medium, high, urgent; default: none).',
          enum: ['none', 'low', 'medium', 'high', 'urgent'],
        },
        assigneeUserId: {
          type: 'string',
          description: 'User ID assigned to this issue.',
        },
        parentIssue: {
          type: 'string',
          description: 'Parent issue ID or identifier if this is a sub-issue.',
        },
        estimate: {
          type: 'number',
          description: 'Effort estimate points (integer between 0 and 100).',
        },
        dueDate: {
          type: 'string',
          description: 'Due date as Unix timestamp seconds or ISO-8601 string.',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of label names or IDs to attach to the issue.',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'issue_update',
    description:
      'Update an existing issue in the 876 Projects workspace by its ID or identifier (such as CONSOLE-12). Modify title, project, description, status, priority, assignee, parent issue, estimate, due date, or labels. Returns the updated issue.',
    inputSchema: {
      type: 'object',
      properties: {
        issue: {
          type: 'string',
          description:
            'The unique issue ID (iss_...) or identifier (such as CONSOLE-12) to update.',
        },
        title: {
          type: 'string',
          description: 'Updated title of the issue.',
        },
        project: {
          type: 'string',
          description: 'Move issue to another project by project ID or key.',
        },
        description: {
          type: 'string',
          description: 'Updated markdown description of the issue.',
        },
        status: {
          type: 'string',
          description:
            'Updated status (backlog, todo, in-progress, in-review, done, canceled).',
          enum: [
            'backlog',
            'todo',
            'in-progress',
            'in-review',
            'done',
            'canceled',
          ],
        },
        priority: {
          type: 'string',
          description:
            'Updated priority level (none, low, medium, high, urgent).',
          enum: ['none', 'low', 'medium', 'high', 'urgent'],
        },
        assigneeUserId: {
          type: 'string',
          description: 'Updated assignee user ID.',
        },
        parentIssue: {
          type: 'string',
          description: 'Updated parent issue ID or identifier.',
        },
        estimate: {
          type: 'number',
          description: 'Updated effort estimate points.',
        },
        dueDate: {
          type: 'string',
          description:
            'Updated due date as Unix timestamp seconds or ISO-8601 string.',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Updated list of label names or IDs to replace existing labels.',
        },
      },
      required: ['issue'],
    },
  },
  {
    name: 'issue_comment',
    description:
      'Add a new comment to an issue in the 876 Projects workspace. Requires the issue identifier or ID and a non-empty comment body. Returns the created comment record.',
    inputSchema: {
      type: 'object',
      properties: {
        issue: {
          type: 'string',
          description:
            'The unique issue ID or identifier (such as CONSOLE-12) to comment on.',
        },
        body: {
          type: 'string',
          description: 'Markdown text content of the comment.',
        },
      },
      required: ['issue', 'body'],
    },
  },
  {
    name: 'issue_comments',
    description:
      'Read an issue comment thread oldest first. Comments carry the requester’s specification and must be read before implementing.',
    inputSchema: {
      type: 'object',
      properties: {
        issue: {
          type: 'string',
          description: 'The issue ID or identifier (such as CONSOLE-12).',
        },
        limit: {
          type: 'number',
          description: 'Maximum comments to return (1 to 100).',
        },
      },
      required: ['issue'],
    },
  },
  {
    name: 'issue_events',
    description:
      'Retrieve the audit history and activity events for an issue in the 876 Projects workspace by its ID or identifier (such as CONSOLE-12). Returns chronological lifecycle events including status and priority changes.',
    inputSchema: {
      type: 'object',
      properties: {
        issue: {
          type: 'string',
          description:
            'The unique issue ID or identifier (such as CONSOLE-12) whose activity history to retrieve.',
        },
      },
      required: ['issue'],
    },
  },
  {
    name: 'labels_list',
    description:
      'List all issue labels configured in the 876 Projects workspace for this organization. Returns label names, colors, and descriptions used for tagging issues.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'work_item_types_list',
    description:
      'List active work item types configured for the 876 Projects workspace. Use the returned keys before creating or updating an issue so its type is valid.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'workflow_states_list',
    description:
      'List active workflow states configured for the 876 Projects workspace. Use the returned keys before creating or updating an issue so its state is valid.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'milestones_list',
    description:
      'List milestones for one project in the 876 Projects workspace. Use the returned milestone keys and status before assigning work to a project milestone.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description:
            'The unique project ID (prj_...) whose milestones to list.',
        },
        status: {
          type: 'string',
          description:
            'Optional milestone status filter (open, completed, canceled).',
          enum: ['open', 'completed', 'canceled'],
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'label_create',
    description:
      'Create a new issue label in the 876 Projects workspace. Requires a unique label name, with optional hex color code and description. Returns the created label record.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Display name of the new label.',
        },
        color: {
          type: 'string',
          description: 'Optional hex color code for the label (e.g. #3b82f6).',
        },
        description: {
          type: 'string',
          description:
            'Optional description explaining what this label is used for.',
        },
      },
      required: ['name'],
    },
  },
] as const
